/*
* Copyright (c) 2021 PSPACE, inc. KSAN Development Team ksan@pspace.co.kr
* KSAN is a suite of free software: you can redistribute it and/or modify it under the terms of
* the GNU General Public License as published by the Free Software Foundation, either version
* 3 of the License.  See LICENSE for details
*
* 본 프로그램 및 관련 소스코드, 문서 등 모든 자료는 있는 그대로 제공이 됩니다.
* KSAN 프로젝트의 개발자 및 개발사는 이 프로그램을 사용한 결과에 따른 어떠한 책임도 지지 않습니다.
* KSAN 개발팀은 사전 공지, 허락, 동의 없이 KSAN 개발에 관련된 모든 결과물에 대한 LICENSE 방식을 변경 할 권리가 있습니다.
 */
package main

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"errors"
	"net/http"

	"gopkg.in/ini.v1"
)

const (
	STR_CONFIG_FILE_PATH = "/usr/local/ksan/etc/ksanAgent.conf"
	STR_MGS              = "mgs"
	STR_PORTAL_HOST      = "PortalHost"
	STR_PORTAL_PORT      = "PortalPort"
	STR_MQ_HOST          = "MQHost"
	STR_MQ_PORT          = "MQPort"
	STR_MQ_USER          = "MQUser"
	STR_MQ_PASSWORD      = "MQPassword"
	STR_PORTAL_API_KEY   = "PortalApiKey"

	STR_DEFAULT_CONFIG_URL = "/api/v1/Config"
	STR_KSAN_GW_CONFIG_URL = STR_DEFAULT_CONFIG_URL + "/KsanGW"

	STR_DISK_POOL_URL       = "/api/v1/DiskPools"
	STR_DISK_POOL_EXIST_URL = STR_DISK_POOL_URL + "/Exist"

	STR_DISK_URL        = "/api/v1/Disks"
	STR_DISK_DETAIL_URL = STR_DISK_URL + "/Detail"

	STR_USER_URL               = "/api/v1/KsanUsers"
	STR_USER_STORAGE_CLASS_URL = STR_USER_URL + "/StorageClass"
)

type KsanAgentConfig struct {
	ServerId     string
	PortalHost   string
	PortalPort   string
	MQHost       string
	MQPort       string
	MQUser       string
	MQPassword   string
	PortalApiKey string
}

type KsanGWConfig struct {
	Authorization       string `json:"authorization"`
	Endpoint            string `json:"endpoint"`
	SecureEndpoint      string `json:"secure_endpoint"`
	KeystorePath        string `json:"keystore_path"`
	KeystorePassword    string `json:"keystore_password"`
	MaxFileSize         int64  `json:"max_file_size"`
	MaxListSize         int    `json:"max_list_size"`
	MaxTimeSkew         int    `json:"max_timeskew"`
	Logging             string `json:"logging"`
	OsdPort             int    `json:"osd_port"`
	JettyMaxThreads     int    `json:"jetty_max_threads"`
	JettyMaxIdleTimeout int    `json:"jetty_max_idle_timeout"`
	OsdClientCount      int    `json:"osd_client_count"`
	ObjManagerCount     int    `json:"objmanager_count"`
	PerformanceMode     string `json:"performance_mode"`
	CacheDiskPath       string `json:"cache_diskpath"`
}

type KsanDisk struct {
	ServerId      string `json:"ServerId"`
	DiskPoolId    string `json:"DiskPoolId"`
	Name          string `json:"Name"`
	Path          string `json:"Path"`
	State         string `json:"State"`
	TotalInode    int64  `json:"TotalInode"`
	ReservedInode int64  `json:"ReservedInode"`
	UsedInode     int64  `json:"UsedInode"`
	TotalSize     int64  `json:"TotalSize"`
	ReservedSize  int64  `json:"ReservedSize"`
	UsedSize      int64  `json:"UsedSize"`
	RwMode        string `json:"RwMode"`
}

type KsanDiskPool struct {
	Id              string
	Name            string
	Description     string
	DiskPoolType    string
	ReplicationType string
	DefaultDiskPool bool
	EC              struct {
		M int
		K int
	}
	ModDate string
	ModId   string
	ModName string
	RegDate string
	RegId   string
	RegName string
}

// Portal Base Response
type BaseResponse struct {
	IsNeedLogin  bool   `json:"IsNeedLogin"`
	AccessDenied bool   `json:"AccessDenied"`
	Result       string `json:"Result"`
	Code         string `json:"Code"`
	Message      string `json:"Message"`
}

// Portal Base List
type BaseList struct {
	TotalCount              int
	Skips                   int
	PageNo                  int
	CountPerPage            int
	PagePerSection          int
	TotalPage               int
	StartPageNo             int
	EndPageNo               int
	PageNos                 []int
	HavePreviousPage        bool
	HaveNextPage            bool
	HavePreviousPageSection bool
	HaveNextPageSection     bool
}

type ResponseExist struct {
	BaseResponse
	Data bool `json:"Data"`
}

// Portal Response Config
type ResponseDataConfig struct {
	BaseResponse
	Data DataConfig `json:"Data"`
}

type KsanDiskPools struct {
	BaseList
	Items []KsanDiskPool `json:"Items"`
}

type ResponseKsanDiskPools struct {
	BaseResponse
	Data KsanDiskPools `json:"Data"`
}

type ResponseKsanDiskPoolDetail struct {
	BaseResponse
	Data KsanDiskPoolDetail `json:"Data"`
}

type ResponseKsanDisk struct {
	BaseResponse
	Data KsanDisk `json:"Data"`
}

type ResponseKsanUser struct {
	BaseResponse
	Data KsanUser `json:"Data"`
}

type DataConfig struct {
	Type    string `json:"Type"`
	Version int    `json:"Version"`
	Config  string `json:"Config"`
	RegDate string `json:"RegDate"`
}

type KsanDiskPoolDetail struct {
	KsanDiskPool
	Disks []KsanDisk `json:"Disks"`
}

type KsanUser struct {
	Id        string `json:"Id"`
	Name      string `json:"Name"`
	Email     string `json:"Email,omitempty"`
	AccessKey string `json:"AccessKey,omitempty"`
	SecretKey string `json:"SecretKey,omitempty"`
}

type RequestKsanDiskPool struct {
	Name            string `json:"Name"`
	Description     string `json:"Description"`
	DiskPoolType    string `json:"DiskPoolType"`
	ReplicationType string `json:"ReplicationType"`
}

func (c *KsanAgentConfig) Load() error {
	cfg, err := ini.Load(STR_CONFIG_FILE_PATH)
	if err != nil {
		logger.Error(err.Error())
		return err
	}

	c.ServerId = cfg.Section(STR_MGS).Key("ServerId").String()
	c.PortalHost = cfg.Section(STR_MGS).Key(STR_PORTAL_HOST).String()
	c.PortalPort = cfg.Section(STR_MGS).Key(STR_PORTAL_PORT).String()
	c.MQHost = cfg.Section(STR_MGS).Key(STR_MQ_HOST).String()
	c.MQPort = cfg.Section(STR_MGS).Key(STR_MQ_PORT).String()
	c.MQUser = cfg.Section(STR_MGS).Key(STR_MQ_USER).String()
	c.MQPassword = cfg.Section(STR_MGS).Key(STR_MQ_PASSWORD).String()
	c.PortalApiKey = cfg.Section(STR_MGS).Key(STR_PORTAL_API_KEY).String()

	return nil
}

// Ksan Disk Pool을 추가한다.
func (c *KsanAgentConfig) addDiskPool(diskPoolName string) error {

	diskPool := RequestKsanDiskPool{
		Name:            diskPoolName,
		Description:     "Created by Hydra",
		DiskPoolType:    "STANDARD",
		ReplicationType: "OnePlusZero",
	}

	jsonBytes, err := json.Marshal(diskPool)
	if err != nil {
		logger.Error(err.Error())
		return err
	}

	req, err := http.NewRequest("POST", c.getPortalURL()+STR_DISK_POOL_URL, bytes.NewBuffer(jsonBytes))
	if err != nil {
		logger.Error(err.Error())
		return err
	}

	req.Header.Set("Authorization", c.PortalApiKey)
	req.Header.Add("Content-Type", "application/json")

	client := getClient()

	resp, err := client.Do(req)
	if err != nil {
		logger.Error(err.Error())
		return err
	}

	defer resp.Body.Close()

	response := BaseResponse{}

	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		logger.Error(err.Error())
		return err
	}

	if response.Result != "Success" {
		logger.Error(response.Message)
		return errors.New(response.Message)
	}

	return nil
}

// Ksan Disk를 추가한다.
func (c *KsanAgentConfig) addDisk(diskPoolName string, diskName string, diskPath string) error {
	disk := KsanDisk{
		ServerId:      c.ServerId,
		DiskPoolId:    diskPoolName,
		Name:          diskName,
		Path:          diskPath,
		State:         "Good",
		TotalInode:    0,
		ReservedInode: 0,
		UsedInode:     0,
		TotalSize:     0,
		ReservedSize:  0,
		UsedSize:      0,
		RwMode:        "ReadWrite",
	}

	jsonBytes, err := json.Marshal(disk)
	if err != nil {
		logger.Error(err.Error())
		return err
	}

	req, err := http.NewRequest("POST", c.getPortalURL()+STR_DISK_URL+"/"+c.ServerId, bytes.NewBuffer(jsonBytes))

	if err != nil {
		logger.Error(err.Error())
		return err
	}

	req.Header.Set("Authorization", c.PortalApiKey)
	req.Header.Add("Content-Type", "application/json")

	client := getClient()

	resp, err := client.Do(req)

	if err != nil {
		logger.Error(err.Error())
		return err
	}

	defer resp.Body.Close()

	response := BaseResponse{}

	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		logger.Error(err.Error())
		return err
	}

	if response.Result != "Success" {
		logger.Error(response.Message)
		return errors.New(response.Message)
	}

	return nil
}

type RequestAddKsanUser struct {
	Name               string
	Email              string
	StandardDiskPoolId string
}

// Ksan User를 추가한다.
func (c *KsanAgentConfig) addUser(userName string, standardDiskPoolName string) (KsanUser, error) {
	user := RequestAddKsanUser{
		Name:               userName,
		StandardDiskPoolId: standardDiskPoolName,
	}

	jsonBytes, err := json.Marshal(user)
	if err != nil {
		logger.Error(err.Error())
		return KsanUser{}, err
	}

	req, err := http.NewRequest("POST", c.getPortalURL()+STR_USER_URL, bytes.NewBuffer(jsonBytes))
	if err != nil {
		logger.Error(err.Error())
		return KsanUser{}, err
	}

	req.Header.Set("Authorization", c.PortalApiKey)
	req.Header.Add("Content-Type", "application/json")

	client := getClient()

	resp, err := client.Do(req)
	if err != nil {
		logger.Error(err.Error())
		return KsanUser{}, err
	}

	defer resp.Body.Close()

	response := ResponseKsanUser{}

	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		logger.Error(err.Error())
		return KsanUser{}, err
	}

	if response.Result != "Success" {
		logger.Error(response.Message)
		return KsanUser{}, errors.New(response.Message)
	}

	return response.Data, nil
}

type RequestAddStorageClass struct {
	UserId       string `json:"UserId"`
	DiskPoolId   string `json:"DiskPoolId"`
	StorageClass string `json:"StorageClass"`
}

// Ksan User에 Storage Class을 추가한다.
func (c *KsanAgentConfig) addUserStorageClass(request RequestAddStorageClass) error {

	jsonBytes, err := json.Marshal(request)
	if err != nil {
		logger.Error(err.Error())
		return err
	}

	req, err := http.NewRequest("POST", c.getPortalURL()+STR_USER_STORAGE_CLASS_URL, bytes.NewBuffer(jsonBytes))
	if err != nil {
		logger.Error(err.Error())
		return err
	}

	req.Header.Set("Authorization", c.PortalApiKey)
	req.Header.Add("Content-Type", "application/json")

	client := getClient()

	resp, err := client.Do(req)

	if err != nil {
		logger.Error(err.Error())
		return err
	}

	defer resp.Body.Close()

	response := BaseResponse{}

	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		logger.Error(err.Error())
		return err
	}

	if response.Result != "Success" {
		logger.Error(response.Message)
		return errors.New(response.Message)
	}

	return nil
}

// Ksan GW 설정 정보를 가져온다.
func (c *KsanAgentConfig) getKsanGWConfig() (KsanGWConfig, error) {
	req, err := http.NewRequest("GET", c.getPortalURL()+STR_KSAN_GW_CONFIG_URL, nil)
	if err != nil {
		logger.Error(err.Error())
		return KsanGWConfig{}, err
	}

	req.Header.Set("Authorization", c.PortalApiKey)

	client := getClient()

	resp, err := client.Do(req)
	if err != nil {
		logger.Error(err.Error())
		return KsanGWConfig{}, err
	}

	defer resp.Body.Close()

	response := ResponseDataConfig{}
	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		logger.Error(err.Error())
		return KsanGWConfig{}, err
	}

	if response.Result != "Success" {
		logger.Error(response.Message)
		return KsanGWConfig{}, errors.New(response.Message)
	}

	ksanGWConfig := KsanGWConfig{}
	err = json.Unmarshal([]byte(response.Data.Config), &ksanGWConfig)
	if err != nil {
		logger.Error(err.Error())
		return KsanGWConfig{}, err
	}

	return ksanGWConfig, nil
}

// Ksan Disk Pool 목록을 가져온다.
func (c *KsanAgentConfig) getDiskPools() ([]KsanDiskPool, error) {
	req, err := http.NewRequest("GET", c.getPortalURL()+STR_DISK_POOL_URL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", c.PortalApiKey)

	client := getClient()

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	response := ResponseKsanDiskPools{}
	err = json.NewDecoder(resp.Body).Decode(&response)

	if err != nil {
		return nil, err
	}

	if response.Result != "Success" {
		return nil, errors.New(response.Message)
	}

	return response.Data.Items, nil
}

// Ksan Disk Pool 상세 정보를 가져온다.
func (c *KsanAgentConfig) getDiskPoolDetail(diskPoolName string) (KsanDiskPoolDetail, error) {
	req, err := http.NewRequest("GET", c.getPortalURL()+STR_DISK_POOL_URL+"/"+diskPoolName, nil)

	if err != nil {
		return KsanDiskPoolDetail{}, err
	}

	req.Header.Set("Authorization", c.PortalApiKey)

	client := getClient()

	resp, err := client.Do(req)
	if err != nil {
		return KsanDiskPoolDetail{}, err
	}

	defer resp.Body.Close()

	response := ResponseKsanDiskPoolDetail{}
	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		return KsanDiskPoolDetail{}, err
	}

	if response.Result != "Success" {
		return KsanDiskPoolDetail{}, errors.New(response.Message)
	}

	return response.Data, nil
}

// Ksan User 상세 정보를 가져온다.
func (c *KsanAgentConfig) getUser(userName string) (KsanUser, error) {
	req, err := http.NewRequest("GET", c.getPortalURL()+STR_USER_URL+"/"+userName, nil)
	if err != nil {
		return KsanUser{}, err
	}

	req.Header.Set("Authorization", c.PortalApiKey)

	client := getClient()

	resp, err := client.Do(req)
	if err != nil {
		return KsanUser{}, err
	}

	defer resp.Body.Close()

	response := ResponseKsanUser{}
	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		return KsanUser{}, err
	}

	if response.Result != "Success" {
		return KsanUser{}, errors.New(response.Message)
	}

	return response.Data, nil
}

// Ksan Disk Pool이 존재하는지 확인한다.
func (c *KsanAgentConfig) isExistDiskPool(diskPoolName string) (bool, error) {
	req, err := http.NewRequest("POST", c.getPortalURL()+STR_DISK_POOL_EXIST_URL+"/"+diskPoolName, nil)
	if err != nil {
		return false, err
	}

	req.Header.Set("Authorization", c.PortalApiKey)

	client := getClient()

	resp, err := client.Do(req)
	if err != nil {
		return false, err
	}

	defer resp.Body.Close()

	response := ResponseExist{}

	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		return false, err
	}

	if response.Result != "Success" {
		return false, errors.New(response.Message)
	}

	return response.Data, nil
}

// Ksan Disk가 존재하는지 확인한다.
func (c *KsanAgentConfig) isExistDisk(diskName string) (bool, error) {
	req, err := http.NewRequest("GET", c.getPortalURL()+STR_DISK_DETAIL_URL+"/"+diskName, nil)
	if err != nil {
		return false, err
	}

	req.Header.Set("Authorization", c.PortalApiKey)

	client := getClient()

	resp, err := client.Do(req)
	if err != nil {
		return false, err
	}

	defer resp.Body.Close()

	response := ResponseKsanDisk{}
	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		return false, err
	}

	if response.Result != "Success" {
		return false, nil
	}

	return true, nil
}

// Ksan User가 존재하는지 확인한다.
func (c *KsanAgentConfig) isExistUser(userName string) (bool, error) {
	req, err := http.NewRequest("GET", c.getPortalURL()+STR_USER_URL+"/"+userName, nil)
	if err != nil {
		return false, err
	}

	req.Header.Set("Authorization", c.PortalApiKey)

	client := getClient()

	resp, err := client.Do(req)

	if err != nil {
		return false, err
	}

	defer resp.Body.Close()

	response := ResponseKsanUser{}
	err = json.NewDecoder(resp.Body).Decode(&response)

	if err != nil {
		return false, err
	}

	if response.Result != "Success" {
		return false, nil
	}

	return true, nil
}

func (c *KsanAgentConfig) getPortalURL() string {
	return "https://" + c.PortalHost + ":" + c.PortalPort
}

func (c *KsanAgentConfig) getS3URL(port int) string {
	return "http://" + c.PortalHost + ":" + string(port)
}

func getClient() *http.Client {
	return &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}
}
