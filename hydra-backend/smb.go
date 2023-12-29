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
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi"
	"gopkg.in/pygz/subprocess.v1"
)

// swagger:model
type Pool struct {
	Id         string    `json:"id" db:"Id"`
	PoolName   string    `json:"pool_name" db:"PoolName"`
	Path       string    `json:"path" db:"Path"`
	Quota      *int      `json:"quota" db:"Quota"`
	Comment    *string   `json:"comment" db:"Comment"`
	Remark     *string   `json:"remark" db:"Remark"`
	UpdateDate time.Time `json:"update_date" db:"UpdateDate"`
}

// @Summary Get pool list
// @Description Get pool list
// @Tags smb
// @Accept  json
// @Produce  json
// @Success 200 {object} []Pool
// @Failure 500 {object} Response
// @Router /api/smb/pools [get]
func getPoolList(w http.ResponseWriter, r *http.Request) {
	// select * from POOLS in database
	pools := []ZPool{}
	err := conn.Select(&pools, "SELECT * FROM ZPOOLS ORDER BY Name ASC")

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, pools)
}

type DatasetPost struct {
	DatasetName string `json:"dataset_name"`
	PoolName    string `json:"pool_name" example:"pool1"`
}

// @Summary Create dataset
// @Description Create dataset
// @Tags smb
// @Accept  json
// @Produce  json
// @Param dataset body DatasetPost true "Dataset"
// @Success 200 {string} string "Dataset created"
// @Failure 500 {object} Response
// @Router /api/smb/datasets [post]
// func createDataset(w http.ResponseWriter, r *http.Request) {
// 	// decode request body into DatasetPost
// 	var dataset DatasetPost
// 	err := json.NewDecoder(r.Body).Decode(&dataset)

// 	if err != nil {
// 		format.JSON(w, http.StatusBadRequest, err.Error())
// 		return
// 	}

// 	// select id from POOLS where PoolName = dataset.PoolName
// 	var poolId string
// 	query := fmt.Sprintf("SELECT Id FROM POOLS WHERE PoolName = '%s'", dataset.PoolName)
// 	err = conn.Get(&poolId, query)

// 	if err != nil {
// 		format.JSON(w, http.StatusInternalServerError, err.Error())
// 		return
// 	}

// 	// insert into DATASETS
// 	query = fmt.Sprintf("INSERT INTO DATASETS (DatasetName, PoolRefId, UpdateDate) VALUES ('%s', '%s', '%s')", dataset.DatasetName, poolId, time.Now().Format("2006-01-02 15:04:05"))
// 	_, err = conn.Exec(query)

// 	if err != nil {
// 		format.JSON(w, http.StatusInternalServerError, err.Error())
// 		return
// 	}

// 	format.JSON(w, http.StatusOK, "Dataset created")
// }

type Dataset struct {
	Id          string    `json:"id" db:"Id"`
	DatasetName string    `json:"dataset_name" db:"DatasetName"`
	PoolRefId   string    `json:"pool_ref_id" db:"PoolRefId"`
	Quota       *int      `json:"quota" db:"Quota"`
	Comment     *string   `json:"comment" db:"Comment"`
	Remark      *string   `json:"remark" db:"Remark"`
	UpdateDate  time.Time `json:"update_date" db:"UpdateDate"`
}

// @Summary Get dataset list
// @Description Get dataset list
// @Tags smb
// @Accept  json
// @Produce  json
// @Success 200 {object} []Dataset
// @Failure 500 {object} Response
// @Router /api/smb/datasets [get]
func getDatasetList(w http.ResponseWriter, r *http.Request) {
	// select * from ZFILESYSTEMS in database
	datasets := []ZFileSystem{}
	err := conn.Select(&datasets, "SELECT * FROM ZFILESYSTEMS ORDER BY Name ASC")

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, datasets)
}

type DatasetInfo struct {
	DatasetName string `json:"dataset_name"`
	PoolName    string `json:"pool_name"`
	DatasetPath string `json:"dataset_path"`
}

// @Summary Get dataset path by id
// @Description Get dataset path by id
// @Tags smb
// @Accept  json
// @Produce  json
// @Param id path string true "Dataset id"
// @Success 200 {object} Dataset
// @Failure 500 {object} Response
// @Router /api/smb/dataset-info/{id} [get]
func getDatasetInfo(w http.ResponseWriter, r *http.Request) {
	// get id from url
	id := chi.URLParam(r, "id")

	datasetInfo := DatasetInfo{}

	// select share
	var datasetrefid string

	query := fmt.Sprintf("SELECT DatasetRefId FROM SMB_SHARES WHERE Id = '%s'", id)
	err := conn.Get(&datasetrefid, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// select dataset
	var dataset ZFileSystem

	query = fmt.Sprintf("SELECT * FROM ZFILESYSTEMS WHERE Id = '%s'", datasetrefid)
	err = conn.Get(&dataset, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	datasetInfo.DatasetName = dataset.Name

	// select pool
	var pool ZPool

	query = fmt.Sprintf("SELECT * FROM ZPOOLS WHERE Id = '%s'", dataset.PoolRefId)
	err = conn.Get(&pool, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	datasetInfo.PoolName = pool.Name
	datasetInfo.DatasetPath = fmt.Sprintf("/%s/%s", pool.Name, dataset.Name)

	format.JSON(w, http.StatusOK, datasetInfo)
}

// @Summary Check if dataset exists
// @Description Check if dataset exists
// @Tags smb
// @Accept  json
// @Produce  json
// @Param datasetName path string true "Dataset name"
// @Param poolName path string true "Pool name"
// @Success 200 {boolean} boolean "Dataset exists"
// @Failure 500 {object} Response
// @Router /api/smb/datasets/name-taken/{poolId}/{datasetName} [get]
func checkIfDatasetExists(w http.ResponseWriter, r *http.Request) {
	// get pool name from url
	poolId := chi.URLParam(r, "poolId")
	// get dataset name from url
	datasetName := chi.URLParam(r, "datasetName")

	// select id from ZFILESYSTEMS when Name = datasetName and PoolRefId = poolId
	datasetId := ""
	query := fmt.Sprintf("SELECT Id FROM ZFILESYSTEMS WHERE Name = '%s' AND PoolRefId = '%s'", datasetName, poolId)
	err := conn.Get(&datasetId, query)

	if err != nil {
		format.JSON(w, http.StatusOK, false)
		return
	}

	if datasetId != "" {
		format.JSON(w, http.StatusOK, true)
		return
	} else {
		format.JSON(w, http.StatusOK, false)
		return
	}
}

// @Summary Check if smb service is active
// @Description Check if smb service is active
// @Tags smb
// @Accept  json
// @Produce  json
// @Success 200 {boolean} boolean "Smb service is active"
// @Failure 500 {object} Response
// @Router /api/smb/service [get]
func isSMBActive(w http.ResponseWriter, r *http.Request) {
	// check if smb service is active
	response := subprocess.Run("systemctl", "status", "smb.service")

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusOK, false)
		return
	}

	lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")
	for _, line := range lines {
		if strings.Contains(line, "Active: active (running)") {
			format.JSON(w, http.StatusOK, true)
			return
		}
	}

	format.JSON(w, http.StatusInternalServerError, "Unknown error")
}

// @Summary Start smb service
// @Description Start smb service
// @Tags smb
// @Accept  json
// @Produce  json
// @Success 200 {string} string "Smb service started"
// @Failure 500 {object} Response
// @Router /api/smb/service/start [put]
func startSMBService(w http.ResponseWriter, r *http.Request) {
	// start smb service
	response := subprocess.Run("service", "smb", "start")

	RequestLog := fmt.Sprintf("[%s] %s requested to start SMB service", LogProcessName, "admin")
	UIRequestLog(RequestLog)

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	SMBLogMessage(LogPriority.Info, smbLogMessageId.SMBServiceStart, LogVariables{})

	format.JSON(w, http.StatusOK, "SMB service started")
}

// @Summary Stop smb service
// @Description Stop smb service
// @Tags smb
// @Accept  json
// @Produce  json
// @Success 200 {string} string "Smb service stopped"
// @Failure 500 {object} Response
// @Router /api/smb/service/stop [put]
func stopSMBService(w http.ResponseWriter, r *http.Request) {
	// stop smb service
	response := subprocess.Run("service", "smb", "stop")

	RequestLog := fmt.Sprintf("[%s] %s requested to stop SMB service", LogProcessName, "admin")
	UIRequestLog(RequestLog)

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	SMBLogMessage(LogPriority.Info, smbLogMessageId.SMBServiceStop, LogVariables{})

	format.JSON(w, http.StatusOK, "SMB service stopped")
}

// swagger:model
type SMBConf struct {
	Id                 string    `json:"id" db:"Id"`
	Workgroup          string    `json:"workgroup" db:"Workgroup"`
	ServerString       *string   `json:"server_string,omitempty" db:"ServerString"`
	UseSendfile        string    `json:"use_sendfile" db:"UseSendfile"`
	UnixExtensions     string    `json:"unix_extensions" db:"UnixExtensions"`
	StoreDosAttributes string    `json:"store_dos_attributes" db:"StoreDosAttributes"`
	SMB2Leases         string    `json:"smb2_leases" db:"SMB2Leases"`
	LogLevel           string    `json:"log_level" db:"LogLevel"`
	MaxLogSize         int       `json:"max_log_size" db:"MaxLogSize"`
	VetoFiles          *string   `json:"veto_files,omitempty" db:"VetoFiles"`
	BindInterfacesOnly string    `json:"bind_interfaces_only" db:"BindInterfacesOnly"`
	Interfaces         *string   `json:"interfaces,omitempty" db:"Interfaces"`
	VfsOption          *string   `json:"vfs_option,omitempty" db:"VfsOption"`
	UpdateDate         time.Time `json:"update_date" db:"UpdateDate"`
}

// @Summary Get smb config
// @Description Get smb config
// @Tags smb
// @Accept  json
// @Produce  json
// @Success 200 {object} SMBConf
// @Failure 500 {object} Response
// @Router /api/smb/config [get]
func getSMBConf(w http.ResponseWriter, r *http.Request) {
	// select * from SMB_GLOBAL_CONF in database
	smbConf := SMBConf{}
	err := conn.Get(&smbConf, "SELECT * FROM SMB_GLOBAL_CONF ORDER BY UpdateDate DESC LIMIT 1")

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, smbConf)
}

// @Summary Get Default Veto Files
// @Description Get Default Veto Files
// @Tags smb
// @Accept  json
// @Produce  json
// @Success 200 {object} string
// @Failure 500 {object} Response
// @Router /api/smb/config/default_veto_files [get]
func getDefaultVetoFiles(w http.ResponseWriter, r *http.Request) {
	var defaultVetoFiles string
	err := conn.Get(&defaultVetoFiles, "SELECT VetoFiles FROM SMB_GLOBAL_CONF ORDER BY UpdateDate DESC LIMIT 1")

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, defaultVetoFiles)
}

// swagger:model
type SMBConfPut struct {
	Workgroup          string  `json:"workgroup" example:"WORKGROUP"`
	ServerString       string  `json:"server_string,omitempty" example:"Samba Server Version 4.9.5"`
	UseSendfile        string  `json:"use_sendfile" example:"y"`
	UnixExtensions     string  `json:"unix_extensions" example:"n"`
	StoreDosAttributes string  `json:"store_dos_attributes" example:"y"`
	SMB2Leases         string  `json:"smb2_leases" example:"y"`
	LogLevel           int     `json:"log_level" example:1`
	MaxLogSize         int     `json:"max_log_size" example:1000`
	VetoFiles          string  `json:"veto_files,omitempty" example:"/._*/.apdisk/.AppleDB/.App"`
	BindInterfacesOnly string  `json:"bind_interfaces_only" example:"y"`
	Interfaces         *string `json:"interfaces,omitempty" example:"eth0,eth1"`
	VfsOption          string  `json:"vfs_option,omitempty" example:"streams_xattr"`
}

// @Summary Update smb config
// @Description Update smb config
// @Tags smb
// @Accept  json
// @Produce  json
// @Param body body SMBConfPut true "SMB config"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/smb/config [put]
func updateSMBConf(w http.ResponseWriter, r *http.Request) {
	// get body from request
	var smbConf SMBConfPut
	err := json.NewDecoder(r.Body).Decode(&smbConf)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to update SMB configuration", LogProcessName, "admin")
	UIRequestLog(RequestLog)

	// check if there is a record in SMB_GLOBAL_CONF
	var id string
	err = conn.Get(&id, "SELECT Id FROM SMB_GLOBAL_CONF ORDER BY UpdateDate DESC LIMIT 1")

	if err != nil {
		// insert into SMB_GLOBAL_CONF
		query := fmt.Sprintf("INSERT INTO SMB_GLOBAL_CONF (Workgroup, ServerString, UseSendfile, UnixExtensions, StoreDosAttributes, SMB2Leases, LogLevel, MaxLogSize, VetoFiles, BindInterfacesOnly, Interfaces, VfsOption, UpdateDate) VALUES ('%s', '%s', '%s', '%s', '%s', '%s', %d, %d, '%s', '%s', '%s', '%s', '%s')",
			smbConf.Workgroup, smbConf.ServerString, smbConf.UseSendfile, smbConf.UnixExtensions, smbConf.StoreDosAttributes, smbConf.SMB2Leases, smbConf.LogLevel, smbConf.MaxLogSize, smbConf.VetoFiles, smbConf.BindInterfacesOnly, *smbConf.Interfaces, smbConf.VfsOption, time.Now().Format("2006-01-02 15:04:05"))

		_, err = conn.Exec(query)

		if err != nil {
			SMBLogMessage(LogPriority.Error, smbLogMessageId.SMBConfigUpdateFail, LogVariables{})

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	} else {
		// update SMB_GLOBAL_CONF where Id = id
		query := fmt.Sprintf("UPDATE SMB_GLOBAL_CONF SET Workgroup = '%s', ServerString = '%s', UseSendfile = '%s', UnixExtensions = '%s', StoreDosAttributes = '%s', SMB2Leases = '%s', LogLevel = %d, MaxLogSize = %d, VetoFiles = '%s', BindInterfacesOnly = '%s', Interfaces = '%s', VfsOption = '%s', UpdateDate = '%s' WHERE Id = '%s'",
			smbConf.Workgroup, smbConf.ServerString, smbConf.UseSendfile, smbConf.UnixExtensions, smbConf.StoreDosAttributes, smbConf.SMB2Leases, smbConf.LogLevel, smbConf.MaxLogSize, smbConf.VetoFiles, smbConf.BindInterfacesOnly, *smbConf.Interfaces, smbConf.VfsOption, time.Now().Format("2006-01-02 15:04:05"), id)

		_, err = conn.Exec(query)

		if err != nil {
			SMBLogMessage(LogPriority.Error, smbLogMessageId.SMBConfigUpdateFail, LogVariables{})

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	SMBLogMessage(LogPriority.Info, smbLogMessageId.SMBConfigUpdate, LogVariables{})

	format.JSON(w, http.StatusOK, "SMB config updated")

	updateSMB()
}

// swagger:model
type SharePost struct {
	ShareName                string `json:"share_name" example:"share1"`
	DatasetRefId             string `json:"dataset_ref_id"`
	Enable                   string `json:"enabled" example:"y"`
	MacSupport               string `json:"mac_support" example:"y"`
	ValidUsers               string `json:"valid_users,omitempty"`
	ReadList                 string `json:"read_list,omitempty"`
	Browsable                string `json:"browsable" example:"y"`
	Writable                 string `json:"writable" example:"y"`
	NetworkAccessAllow       string `json:"network_access_allow,omitempty"`
	NetworkAccessAllowExcept string `json:"network_access_allow_except,omitempty"`
	NetworkAccessDeny        string `json:"network_access_deny,omitempty"`
	NetworkAccessDenyExcept  string `json:"network_access_deny_except,omitempty"`
	GuestAccess              string `json:"guest_access" example:"y"`
	CaseSensitive            string `json:"case_sensitive" example:"y"`
	Oplock                   string `json:"oplock" example:"y"`
	Level2Oplock             string `json:"level2_oplocks" example:"y"`
	KernelShareModes         string `json:"kernel_share_modes" example:"y"`
	PosixLocking             string `json:"posix_locking" example:"y"`
	InheritOwner             string `json:"inherit_owner" example:"y"`
	InheritPermissions       string `json:"inherit_permissions" example:"y"`
	DeleteVetoFiles          string `json:"delete_veto_files,omitempty"`
	VetoFiles                string `json:"veto_files,omitempty"`
	FullAudit                string `json:"full_audit,omitempty"`
	WORM                     string `json:"worm" db:"WORM"`
	GracePeriod              int    `json:"grace_period" db:"GracePeriod"`
	Comment                  string `json:"comment,omitempty"`
}

// @Summary Create share
// @Description Create share
// @Tags smb
// @Accept  json
// @Produce  json
// @Param dataset body SharePost true "Share"
// @Success 200 {string} string "Share created"
// @Failure 500 {object} Response
// @Router /api/smb/shares [post]
func createShare(w http.ResponseWriter, r *http.Request) {
	// decode request body into SharePost
	var share SharePost
	err := json.NewDecoder(r.Body).Decode(&share)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to create a new share", LogProcessName, "admin")
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: share.ShareName,
	}

	// insert into SHARES
	query := fmt.Sprintf("INSERT INTO SMB_SHARES (ShareName, DatasetRefId, Enable, MacSupport, ValidUsers, ReadList, Browsable, Writable, NetworkAccessAllow, NetworkAccessAllowExcept, NetworkAccessDeny, NetworkAccessDenyExcept, GuestAccess, CaseSensitive, Oplock, Level2Oplock, KernelShareModes, PosixLocking, InheritOwner, InheritPermissions, DeleteVetoFiles, VetoFiles, FullAudit, WORM, GracePeriod, Comment, UpdateDate) VALUES ('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', %d, '%s', '%s')",
		share.ShareName, share.DatasetRefId, share.Enable, share.MacSupport, share.ValidUsers, share.ReadList,
		share.Browsable, share.Writable, share.NetworkAccessAllow, share.NetworkAccessAllowExcept,
		share.NetworkAccessDeny, share.NetworkAccessDenyExcept, share.GuestAccess, share.CaseSensitive,
		share.Oplock, share.Level2Oplock, share.KernelShareModes, share.PosixLocking, share.InheritOwner,
		share.InheritPermissions, share.DeleteVetoFiles, share.VetoFiles, share.FullAudit,
		share.WORM, share.GracePeriod, share.Comment, time.Now().Format("2006-01-02 15:04:05"))

	_, err = conn.Exec(query)

	if err != nil {
		SMBLogMessage(LogPriority.Error, smbLogMessageId.SMBCreateFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	if share.Enable == "y" {
		updateSMB()
	}

	// chmod 777 /pool1/dataset1
	// select dataset name from ZFILESYSTEMS where id = share.DatasetRefId
	var datasetName string
	query = fmt.Sprintf("SELECT Name FROM ZFILESYSTEMS WHERE Id = '%s'", share.DatasetRefId)
	err = conn.QueryRow(query).Scan(&datasetName)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
	}

	// select pool name from ZPOOLS where id = dataset.PoolRefId
	var poolName string
	query = fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = (SELECT PoolRefId FROM ZFILESYSTEMS WHERE Id = '%s')", share.DatasetRefId)
	err = conn.QueryRow(query).Scan(&poolName)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
	}

	// chmod 777 /pool1/dataset1
	response := subprocess.Run("chmod", "777", fmt.Sprintf("/%s/%s", poolName, datasetName))

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
	}

	SMBLogMessage(LogPriority.Info, smbLogMessageId.SMBCreate, logVariables)

	format.JSON(w, http.StatusOK, "Share created")
}

// @Summary Update share
// @Description Update share
// @Tags smb
// @Accept  json
// @Produce  json
// @Param id path string true "Share ID"
// @Param dataset body SharePost true "Share"
// @Success 200 {string} string "SMB config updated"
// @Failure 500 {object} Response
// @Router /api/smb/shares/{id} [put]
func updateShare(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// decode request body into SharePost
	var share SharePost
	err := json.NewDecoder(r.Body).Decode(&share)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to update share '%s'", LogProcessName, "admin", share.ShareName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: share.ShareName,
	}

	query := fmt.Sprintf("UPDATE SMB_SHARES SET Enable = '%s', Browsable = '%s', Writable = '%s', NetworkAccessAllow = '%s', NetworkAccessAllowExcept = '%s', NetworkAccessDeny = '%s', NetworkAccessDenyExcept = '%s', GuestAccess = '%s', CaseSensitive = '%s', Oplock = '%s', Level2Oplock = '%s', KernelShareModes = '%s', PosixLocking = '%s', InheritOwner = '%s', InheritPermissions = '%s', DeleteVetoFiles = '%s', VetoFiles = '%s', FullAudit = '%s', WORM = '%s', GracePeriod = %d, Comment = '%s', UpdateDate = '%s' WHERE Id = '%s'",
		share.Enable, share.Browsable, share.Writable, share.NetworkAccessAllow, share.NetworkAccessAllowExcept,
		share.NetworkAccessDeny, share.NetworkAccessDenyExcept, share.GuestAccess, share.CaseSensitive,
		share.Oplock, share.Level2Oplock, share.KernelShareModes, share.PosixLocking, share.InheritOwner,
		share.InheritPermissions, share.DeleteVetoFiles, share.VetoFiles, share.FullAudit,
		share.WORM, share.GracePeriod, share.Comment, time.Now().Format("2006-01-02 15:04:05"), id)

	_, err = conn.Exec(query)

	// if writable = no, add all users to read list
	if share.Writable == "n" {
		query = fmt.Sprintf("UPDATE SMB_USER_MAP SET Permission = '%s' WHERE ShareRefId = '%s'", "r", id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			// return
		}

		query = fmt.Sprintf("UPDATE SMB_GROUP_MAP SET Permission = '%s' WHERE ShareRefId = '%s'", "r", id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			// return
		}
	}

	if err != nil {
		SMBLogMessage(LogPriority.Error, smbLogMessageId.SMBUpdateFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	if share.Enable == "y" {
		updateSMB()
	}

	SMBLogMessage(LogPriority.Info, smbLogMessageId.SMBUpdate, logVariables)

	format.JSON(w, http.StatusOK, "Share updated")
}

// swagger:model
type Share struct {
	Id                       string  `json:"id" db:"Id"`
	ShareName                string  `json:"share_name" db:"ShareName"`
	DatasetRefId             string  `json:"dataset_ref_id" db:"DatasetRefId"`
	Enable                   string  `json:"enable" db:"Enable"`
	MacSupport               string  `json:"mac_support" db:"MacSupport"`
	ValidUsers               string  `json:"valid_users" db:"ValidUsers"`
	ReadList                 string  `json:"read_list" db:"ReadList"`
	Browsable                string  `json:"browsable" db:"Browsable"`
	Writable                 string  `json:"writable" db:"Writable"`
	NetworkAccessAllow       string  `json:"network_access_allow" db:"NetworkAccessAllow"`
	NetworkAccessAllowExcept string  `json:"network_access_allow_except" db:"NetworkAccessAllowExcept"`
	NetworkAccessDeny        string  `json:"network_access_deny" db:"NetworkAccessDeny"`
	NetworkAccessDenyExcept  string  `json:"network_access_deny_except" db:"NetworkAccessDenyExcept"`
	GuestAccess              string  `json:"guest_access" db:"GuestAccess"`
	CaseSensitive            string  `json:"case_sensitive" db:"CaseSensitive"`
	Oplock                   string  `json:"oplock" db:"Oplock"`
	Level2Oplock             string  `json:"level2_oplock" db:"Level2Oplock"`
	KernelShareModes         string  `json:"kernel_share_modes" db:"KernelShareModes"`
	PosixLocking             string  `json:"posix_locking" db:"PosixLocking"`
	SMB2Leases               string  `json:"smb2_leases" db:"SMB2Leases"`
	InheritOwner             string  `json:"inherit_owner" db:"InheritOwner"`
	InheritPermissions       string  `json:"inherit_permissions" db:"InheritPermissions"`
	DeleteVetoFiles          string  `json:"delete_veto_files" db:"DeleteVetoFiles"`
	VetoFiles                *string `json:"veto_files,omitempty" db:"VetoFiles"`
	FullAudit                string  `json:"full_audit" db:"FullAudit"`
	WORM                     string  `json:"worm" db:"WORM"`
	GracePeriod              int     `json:"grace_period" db:"GracePeriod"`
	Comment                  *string `json:"comment,omitempty" db:"Comment"`
	UpdateDate               string  `json:"update_date" db:"UpdateDate"`
}

type ShareListEntry struct {
	Id          string  `json:"id"`
	ShareName   string  `json:"share_name"`
	DatasetPath string  `json:"dataset_path"`
	Enable      string  `json:"enable"`
	GuestAccess string  `json:"guest_access"`
	Writable    string  `json:"writable"`
	Comment     *string `json:"comment"`
}

// @Summary Get all shares
// @Description Get all shares
// @Tags smb
// @Accept  json
// @Produce  json
// @Success 200 {array} Share
// @Failure 500 {object} Response
// @Router /api/smb/shares [get]
func getShareList(w http.ResponseWriter, r *http.Request) {
	var shares []Share
	err := conn.Select(&shares, "SELECT * FROM SMB_SHARES ORDER BY ShareName ASC")

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	shareList := []ShareListEntry{}
	for _, share := range shares {
		// select poolrefid from ZFILESYSTEMS where id = share.datasetrefid
		var poolRefId string
		err = conn.Get(&poolRefId, fmt.Sprintf("SELECT PoolRefId FROM ZFILESYSTEMS WHERE Id = '%s'", share.DatasetRefId))

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		// select path from pools where id = poolrefid
		var poolName string
		err = conn.Get(&poolName, fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", poolRefId))

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		// select dataset name from datasets where id = share.datasetrefid
		var datasetName string
		err = conn.Get(&datasetName, fmt.Sprintf("SELECT Name FROM ZFILESYSTEMS WHERE Id = '%s'", share.DatasetRefId))

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		shareList = append(shareList, ShareListEntry{Id: share.Id, ShareName: share.ShareName, DatasetPath: "/" + poolName + "/" + datasetName, Enable: share.Enable, GuestAccess: share.GuestAccess, Writable: share.Writable, Comment: share.Comment})
	}

	format.JSON(w, http.StatusOK, shareList)
}

// @Summary Get share by id
// @Description Get share by id
// @Tags smb
// @Accept  json
// @Produce  json
// @Param id path string true "Share id"
// @Success 200 {object} Share
// @Failure 500 {object} Response
// @Router /api/smb/shares/{id} [get]
func getShareById(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var share Share
	err := conn.Get(&share, fmt.Sprintf("SELECT * FROM SMB_SHARES WHERE Id = '%s'", id))

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, share)
}

// @Summary Enable / Disable share
// @Description Enable / Disable share
// @Tags smb
// @Accept  json
// @Produce  json
// @Param id path string true "Share id"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/smb/shares/{id}/toggle [put]
func toggleShare(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var share Share
	err := conn.Get(&share, fmt.Sprintf("SELECT * FROM SMB_SHARES WHERE Id = '%s'", id))

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// if pool is exported, return error
	var poolName string
	err = conn.Get(&poolName, fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = (SELECT PoolRefId FROM ZFILESYSTEMS WHERE Id = '%s')", share.DatasetRefId))

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// check if pool is exported
	poolExported := checkIfPoolIsExported(poolName)

	if poolExported {
		format.JSON(w, http.StatusInternalServerError, "Cannot enable share since the pool where the dataset is located is exported.<br>Please import the pool first.")
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to (dis)enable share '%s'", LogProcessName, "admin", share.ShareName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: share.ShareName,
	}

	var enable bool
	if share.Enable == "y" {
		enable = false
	} else {
		enable = true
	}

	if !enable {
		query := fmt.Sprintf("UPDATE SMB_SHARES SET Enable = 'n' WHERE Id = '%s'", id)
		_, err = conn.Exec(query)

		if err != nil {
			SMBLogMessage(LogPriority.Error, smbLogMessageId.SMBShareDisableFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	} else {
		query := fmt.Sprintf("UPDATE SMB_SHARES SET Enable = 'y' WHERE Id = '%s'", id)
		_, err = conn.Exec(query)

		if err != nil {
			SMBLogMessage(LogPriority.Error, smbLogMessageId.SMBShareEnableFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	updateSMB()

	if enable {
		SMBLogMessage(LogPriority.Info, smbLogMessageId.SMBShareEnable, logVariables)
	} else {
		SMBLogMessage(LogPriority.Info, smbLogMessageId.SMBShareDisable, logVariables)
	}

	format.JSON(w, http.StatusOK, "Share updated")
}

type SMBUserMap struct {
	Id         string `json:"id" db:"Id"`
	ShareRefId string `json:"share_id" db:"ShareRefId"`
	UserRefId  string `json:"username" db:"UserRefId"`
	Permission string `json:"permission" db:"Permission"`
	UpdateDate string `json:"update_date" db:"UpdateDate"`
}

type SMBUsers struct {
	UserId     string  `json:"user_id"`
	UserName   string  `json:"user_name"`
	Permission string  `json:"permission"`
	Comment    *string `json:"comment,omitempty"`
}

// @Summary Get users for share
// @Description Get users for share
// @Tags smb
// @Accept  json
// @Produce  json
// @Param id path string true "Share id"
// @Success 200 {array} SMBUserMap
// @Failure 500 {object} Response
// @Router /api/smb/shares/{id}/users [get]
func getUsersByShare(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var SMBUserMap []SMBUserMap
	err := conn.Select(&SMBUserMap, fmt.Sprintf("SELECT * FROM SMB_USER_MAP WHERE ShareRefId = '%s'", id))

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// return object --> SMBUsers
	smbUsers := []SMBUsers{}
	for _, user := range SMBUserMap {
		var u User_
		err := conn.Get(&u, fmt.Sprintf("SELECT * FROM USERS WHERE Id = '%s'", user.UserRefId))

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		smbUsers = append(smbUsers, SMBUsers{UserId: u.Id, UserName: u.UserId, Permission: user.Permission, Comment: u.Comment})
	}

	format.JSON(w, http.StatusOK, smbUsers)
}

// @Summary Set users for share
// @Description Set users for share
// @Tags smb
// @Accept  json
// @Produce  json
// @Param id path string true "Share id"
// @Param users body []SMBUsers true "Users"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/smb/shares/{id}/users [put]
func setUsersByShare(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var users []SMBUsers
	err := json.NewDecoder(r.Body).Decode(&users)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// select share name by id
	query := fmt.Sprintf("SELECT ShareName FROM SMB_SHARES WHERE Id = '%s'", id)
	var shareName string
	err = conn.Get(&shareName, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to update list of users assigned to share '%s'", LogProcessName, "admin", shareName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: shareName,
	}

	// delete all users for share
	query = fmt.Sprintf("DELETE FROM SMB_USER_MAP WHERE ShareRefId = '%s'", id)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		// return
	}

	userNames := []string{}

	// insert new users
	for _, user := range users {
		query := fmt.Sprintf("INSERT INTO SMB_USER_MAP (ShareRefId, UserRefId, Permission, UpdateDate) VALUES ('%s', '%s', '%s', '%s')", id, user.UserId, user.Permission, time.Now().Format("2006-01-02 15:04:05"))
		_, err = conn.Exec(query)

		if err != nil {
			SMBLogMessage(LogPriority.Error, smbLogMessageId.SMBUserAddFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		// select user name by id
		query = fmt.Sprintf("SELECT UserId FROM USERS WHERE Id = '%s'", user.UserId)
		var userName string
		err = conn.Get(&userName, query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			// return
		}

		userNames = append(userNames, userName)
		logVariables.TargetValues = userNames
	}

	updateSMB()

	SMBLogMessage(LogPriority.Info, smbLogMessageId.SMBUserAdd, logVariables)

	format.JSON(w, http.StatusOK, "Users updated")
}

type SMBGroupMap struct {
	Id         string `json:"id" db:"Id"`
	ShareRefId string `json:"share_id" db:"ShareRefId"`
	GroupRefId string `json:"group_name" db:"GroupRefId"`
	Permission string `json:"permission" db:"Permission"`
	UpdateDate string `json:"update_date" db:"UpdateDate"`
}

type SMBGroups struct {
	GroupId    string  `json:"group_id"`
	GroupName  string  `json:"group_name"`
	Permission string  `json:"permission"`
	Comment    *string `json:"comment,omitempty"`
}

// @Summary Get groups for share
// @Description Get groups for share
// @Tags smb
// @Accept  json
// @Produce  json
// @Param id path string true "Share id"
// @Success 200 {array} SMBGroupMap
// @Failure 500 {object} Response
// @Router /api/smb/shares/{id}/groups [get]
func getGroupsByShare(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var SMBGroupMap []SMBGroupMap
	err := conn.Select(&SMBGroupMap, fmt.Sprintf("SELECT * FROM SMB_GROUP_MAP WHERE ShareRefId = '%s'", id))

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// return object --> SMBGroups
	smbGroups := []SMBGroups{}
	for _, group := range SMBGroupMap {
		var g Group
		err := conn.Get(&g, fmt.Sprintf("SELECT * FROM GROUPS WHERE Id = '%s'", group.GroupRefId))

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		smbGroups = append(smbGroups, SMBGroups{GroupId: g.Id, GroupName: g.GroupId, Permission: group.Permission, Comment: g.Comment})
	}

	format.JSON(w, http.StatusOK, smbGroups)
}

// @Summary Set groups for share
// @Description Set groups for share
// @Tags smb
// @Accept  json
// @Produce  json
// @Param id path string true "Share id"
// @Param groups body []SMBGroups true "Groups"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/smb/shares/{id}/groups [put]
func setGroupsByShare(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var groups []SMBGroups
	err := json.NewDecoder(r.Body).Decode(&groups)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// select share name by id
	query := fmt.Sprintf("SELECT ShareName FROM SMB_SHARES WHERE Id = '%s'", id)
	var shareName string
	err = conn.Get(&shareName, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to update list of users assigned to share '%s'", LogProcessName, "admin", shareName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: shareName,
	}

	// delete all groups for share
	query = fmt.Sprintf("DELETE FROM SMB_GROUP_MAP WHERE ShareRefId = '%s'", id)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		// return
	}

	var groupNames = []string{}

	// insert new groups
	for _, group := range groups {
		query := fmt.Sprintf("INSERT INTO SMB_GROUP_MAP (ShareRefId, GroupRefId, Permission, UpdateDate) VALUES ('%s', '%s', '%s', '%s')", id, group.GroupId, group.Permission, time.Now().Format("2006-01-02 15:04:05"))
		_, err = conn.Exec(query)

		if err != nil {
			SMBLogMessage(LogPriority.Error, smbLogMessageId.SMBGroupAddFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		// select user name by id
		query = fmt.Sprintf("SELECT GroupId FROM GROUPS WHERE Id = '%s'", group.GroupId)
		var groupName string
		err = conn.Get(&groupName, query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			// return
		}

		groupNames = append(groupNames, groupName)
		logVariables.TargetValues = groupNames
	}

	updateSMB()

	SMBLogMessage(LogPriority.Info, smbLogMessageId.SMBGroupAdd, logVariables)

	format.JSON(w, http.StatusOK, "Groups updated")
}

// @Summary Delete share
// @Description Delete share
// @Tags smb
// @Accept  json
// @Produce  json
// @Param id path string true "Share id"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/smb/shares/{id} [delete]
func deleteShare(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// select share name by id
	query := fmt.Sprintf("SELECT ShareName FROM SMB_SHARES WHERE Id = '%s'", id)
	var shareName string
	err := conn.Get(&shareName, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to delete share '%s'", LogProcessName, "admin", shareName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: shareName,
	}

	// delete users
	query = fmt.Sprintf("DELETE FROM SMB_USER_MAP WHERE ShareRefId = '%s'", id)
	_, err = conn.Exec(query)

	if err != nil {
		SMBLogMessage(LogPriority.Error, smbLogMessageId.SMBDeleteFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// delete groups
	query = fmt.Sprintf("DELETE FROM SMB_GROUP_MAP WHERE ShareRefId = '%s'", id)
	_, err = conn.Exec(query)

	if err != nil {
		SMBLogMessage(LogPriority.Error, smbLogMessageId.SMBDeleteFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// delete share
	query = fmt.Sprintf("DELETE FROM SMB_SHARES WHERE Id = '%s'", id)
	_, err = conn.Exec(query)

	if err != nil {
		SMBLogMessage(LogPriority.Error, smbLogMessageId.SMBDeleteFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	updateSMB()

	SMBLogMessage(LogPriority.Info, smbLogMessageId.SMBDelete, logVariables)

	format.JSON(w, http.StatusOK, "Share deleted")
}

// @Summary Check if share exists
// @Description Check if share exists
// @Tags smb
// @Accept  json
// @Produce  json
// @Param shareName path string true "Share name"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/smb/shares/name-taken/{shareName} [get]
func checkIfShareExists(w http.ResponseWriter, r *http.Request) {
	shareName := chi.URLParam(r, "shareName")

	// select id by share name
	query := fmt.Sprintf("SELECT Id FROM SMB_SHARES WHERE ShareName = '%s'", shareName)
	var id string
	err := conn.Get(&id, query)

	if err != nil {
		format.JSON(w, http.StatusOK, false)
		return
	}

	format.JSON(w, http.StatusOK, true)
}

// @Summary Delete user from share
// @Description Delete user from share
// @Tags smb
// @Accept  json
// @Produce  json
// @Param id path string true "Share id"
// @Param userId path string true "User id"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/smb/shares/{id}/users/{userId} [delete]
func deleteUserFromShare(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userId := chi.URLParam(r, "userId")

	// select user name from userId
	query := fmt.Sprintf("SELECT UserId FROM USERS WHERE Id = '%s'", userId)
	var userName string
	err := conn.Get(&userName, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// select share name from id
	query = fmt.Sprintf("SELECT ShareName FROM SMB_SHARES WHERE Id = '%s'", id)
	var shareName string
	err = conn.Get(&shareName, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to remove user '%s' from share '%s'", LogProcessName, "admin", userName, shareName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: shareName,
		TargetName: userName,
	}

	query = fmt.Sprintf("DELETE FROM SMB_USER_MAP WHERE ShareRefId = '%s' AND UserRefId = '%s'", id, userId)
	_, err = conn.Exec(query)

	if err != nil {
		SMBLogMessage(LogPriority.Error, smbLogMessageId.SMBUserDeleteFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	updateSMB()

	SMBLogMessage(LogPriority.Info, smbLogMessageId.SMBUserDelete, logVariables)

	format.JSON(w, http.StatusOK, "User deleted")
}

// @Summary Delete group from share
// @Description Delete group from share
// @Tags smb
// @Accept  json
// @Produce  json
// @Param id path string true "Share id"
// @Param groupId path string true "Group id"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/smb/shares/{id}/groups/{groupId} [delete]
func deleteGroupFromShare(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	groupId := chi.URLParam(r, "groupId")

	// select group name from groupId
	query := fmt.Sprintf("SELECT GroupId FROM GROUPS WHERE Id = '%s'", groupId)
	var groupName string
	err := conn.Get(&groupName, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// select share name from id
	query = fmt.Sprintf("SELECT ShareName FROM SMB_SHARES WHERE Id = '%s'", id)
	var shareName string
	err = conn.Get(&shareName, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to remove group '%s' from share '%s'", LogProcessName, "admin", groupName, shareName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: shareName,
		TargetName: groupName,
	}

	query = fmt.Sprintf("DELETE FROM SMB_GROUP_MAP WHERE ShareRefId = '%s' AND GroupRefId = '%s'", id, groupId)
	_, err = conn.Exec(query)

	if err != nil {
		SMBLogMessage(LogPriority.Error, smbLogMessageId.SMBGroupDeleteFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	updateSMB()

	SMBLogMessage(LogPriority.Info, smbLogMessageId.SMBGroupDelete, logVariables)

	format.JSON(w, http.StatusOK, "Group deleted")
}
