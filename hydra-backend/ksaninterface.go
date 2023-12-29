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
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/go-chi/chi"
	"github.com/google/uuid"
	"gopkg.in/pygz/subprocess.v1"
)

func (KsanConfiguration) TableName() string { return "KSAN_CONF" }

type KsanConfiguration struct {
	Id            string    `gorm:"column:ID;primaryKey;type:char(36)" json:"id"`
	UpdateDate    time.Time `gorm:"column:UPDATE_DATE;" json:"update_date"`
	Enable        string    `gorm:"column:ENABLE;type:char(1)" json:"enable"` // "n": disable, "y": enable
	DiskName      string    `gorm:"column:DISK_NAME;size:256" json:"disk_name"`
	DiskPoolName  string    `gorm:"column:DISK_POOL_NAME;size:256" json:"disk_pool_name"`
	ArchiveName   string    `gorm:"column:ARCHIVE_NAME;size:256" json:"archive_name"`
	UserName      string    `gorm:"column:USER_NAME;size:256" json:"user_name"`
	AccessKey     string    `gorm:"column:ACCESS_KEY;size:256" json:"access_key"`
	SecretKey     string    `gorm:"column:SECRET_KEY;size:256" json:"secret_key"`
	BucketName    string    `gorm:"column:BUCKET_NAME;size:64" json:"bucket_name"`
	LifecycleDays int       `gorm:"column:LIFECYCLE_DAYS;" json:"lifecycle_days"`

	DatasetRefId string `gorm:"column:DATASET_REF_ID;type:char(36)" json:"dataset_ref_id,omitempty"`
	DatasetName  string `gorm:"-" json:"dataset_name,omitempty"`
	PoolName     string `gorm:"-" json:"pool_name,omitempty"`
}

func isKsanAgentActive() (bool, error) {
	// check exists ksanAgent.conf
	info, err := os.Stat(STR_CONFIG_FILE_PATH)
	if err != nil {
		logger.Error(err.Error())
		return false, nil
	}

	if os.IsNotExist(err) {
		return false, nil
	}
	return !info.IsDir(), nil
}

func isKsanGWActive() (bool, error) {
	response := subprocess.Run("systemctl", "status", "ksanGW.service")

	if response.ExitCode != 0 {
		return false, nil
	} else {
		lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")
		for _, line := range lines {
			if strings.Contains(line, "Active: active (running)") {
				return true, nil
			}
		}
		return false, nil
	}
}

func isKsanOSDActive() (bool, error) {
	response := subprocess.Run("systemctl", "status", "ksanOSD.service")

	if response.ExitCode != 0 {
		return false, nil
	} else {
		lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")
		for _, line := range lines {
			if strings.Contains(line, "Active: active (running)") {
				return true, nil
			}
		}
		return false, nil
	}
}

type KsanActive struct {
	IsKsanAgentActive bool `json:"IsKsanAgentActive"`
	IsKsanGWActive    bool `json:"IsKsanGWActive"`
	IsKsanOSDActive   bool `json:"IsKsanOSDActive"`
}

// @Summary Get KSAN Configuration
// @Description Get KSAN Configuration
// @Tags KSAN
// @Accept  json
// @Produce  json
// @Success 200 {object} KsanActive
// @Failure 500 {object} Response
// @Router /api/ksan/active [get]
func isKsanActive(w http.ResponseWriter, r *http.Request) {
	isKsanAgentActive, err := isKsanAgentActive()
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}
	isKsanGWActive, err := isKsanGWActive()
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}
	isKsanOSDActive, err := isKsanOSDActive()
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	isKsanActive := KsanActive{
		IsKsanAgentActive: isKsanAgentActive,
		IsKsanGWActive:    isKsanGWActive,
		IsKsanOSDActive:   isKsanOSDActive,
	}

	format.JSON(w, http.StatusOK, isKsanActive)
	return
}

// @Summary Get KSAN Disk Pools
// @Description Get KSAN Disk Pools
// @Tags KSAN
// @Accept  json
// @Produce  json
// @Success 200 {object} KsanDiskPools
// @Failure 500 {object} Response
// @Router /api/ksan/diskpools [get]
func getKsanDiskPools(w http.ResponseWriter, r *http.Request) {
	ksanAgentConfig := KsanAgentConfig{}
	err := ksanAgentConfig.Load()
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	ksanDiskPools, err := ksanAgentConfig.getDiskPools()
	if err != nil {
		logger.Error(err.Error())
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, ksanDiskPools)
	return
}

// @Summary Get KSAN User
// @Description Get KSAN User
// @Tags KSAN
// @Accept  json
// @Produce  json
// @Success 200 {object} KsanUser
// @Failure 500 {object} Response
// @Router /api/ksan/user/{userName} [get]
func getKsanUser(w http.ResponseWriter, r *http.Request) {
	userName := chi.URLParam(r, "userName")

	if userName == "" {
		format.JSON(w, http.StatusBadRequest, "userName is empty")
		return
	}

	ksanAgentConfig := KsanAgentConfig{}
	err := ksanAgentConfig.Load()
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	ksanUser, err := ksanAgentConfig.getUser(userName)
	if err != nil {
		logger.Error(err.Error())
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, ksanUser)
	return
}

// @Summary Get KSAN GW Configuration
// @Description Get KSAN GW Configuration
// @Tags KSAN
// @Accept  json
// @Produce  json
// @Success 200 {object} KsanGWConfig
// @Failure 500 {object} Response
// @Router /api/ksan/configuration/gw [get]
func getKsanGWConfiguration(w http.ResponseWriter, r *http.Request) {
	ksanAgentConfig := KsanAgentConfig{}
	err := ksanAgentConfig.Load()
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	ksanGWConfig, err := ksanAgentConfig.getKsanGWConfig()
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		logger.Error(err.Error())
		return
	}

	format.JSON(w, http.StatusOK, ksanGWConfig)
	return
}

// @Summary Get KSAN Configuration
// @Description Get KSAN Configuration
// @Tags KSAN
// @Accept  json
// @Produce  json
// @Success 200 {object} KsanConfiguration
// @Failure 500 {object} KsanConfiguration
// @Router /api/ksan/configuration [get]
func getKsanConfiguration(w http.ResponseWriter, r *http.Request) {

	// Ksan 설정 정보를 가져온다.
	ksanConfiguration := KsanConfiguration{}
	if err := db.First(&ksanConfiguration).Error; err != nil {
		logger.Error(err.Error())
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	if ksanConfiguration.DatasetRefId != "" {
		// zFileSystems에서 dataset name 가져오기
		var zFileSystem ZFileSystem
		if err := db.Where("Id = ?", ksanConfiguration.DatasetRefId).First(&zFileSystem).Error; err != nil {
			logger.Error(err.Error())
			format.JSON(w, http.StatusOK, ksanConfiguration)
			return
		}
		ksanConfiguration.DatasetName = zFileSystem.Name

		// zPools에서 pool name 가져오기
		var zPool ZPool
		if err := db.Where("Id = ?", zFileSystem.PoolRefId).First(&zPool).Error; err != nil {
			logger.Error(err.Error())
			format.JSON(w, http.StatusOK, ksanConfiguration)
			return
		}
		ksanConfiguration.PoolName = zPool.Name

		// check is active
		isActive, err := isKsanActiveCheck()
		if err != nil {
			logger.Error(err.Error())
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		if isActive {
			ksanConfiguration.Enable = "y"
		} else {
			ksanConfiguration.Enable = "n"
		}

		format.JSON(w, http.StatusOK, ksanConfiguration)
		return
	} else {
		format.JSON(w, http.StatusOK, ksanConfiguration)
	}
}

// @Summary Check KSAN Configuration
// @Description Check KSAN Configuration
// @Tags KSAN
// @Accept  json
// @Produce  json
// @Param body body KsanConfiguration true "Ksan Configuration"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/ksan/configuration/check [post]
func checkKsanConfiguration(w http.ResponseWriter, r *http.Request) {
	// Request Body를 가져온다.
	ksanConfiguration := KsanConfiguration{}
	if err := json.NewDecoder(r.Body).Decode(&ksanConfiguration); err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Ksan 설정 정보를 가져온다.
	ksanAgentConfig := KsanAgentConfig{}
	if err := ksanAgentConfig.Load(); err != nil {
		logger.Error(err.Error())
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Ksan 동작 여부 확인
	isActive, err := isKsanActiveCheck()
	if err != nil {
		logger.Error(err.Error())
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}
	// 활성화 되어 있지 않을 경우 에러
	if !isActive {
		format.JSON(w, http.StatusConflict, "KSAN is not active")
		return
	}

	// NickName을 만든다.
	nickName, err := ksanConfiguration.getNickName()
	if err != nil {
		logger.Error(err.Error())
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Ksan Disk Pool이 존재하는지 확인한다.
	isExist, err := ksanAgentConfig.isExistDiskPool(nickName)

	// 에러가 발생하면 에러를 리턴한다.
	if err != nil {
		logger.Error(err.Error())
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	} else if isExist {
		// 이미 존재하면 에러를 출력한다.
		errorMessage := "KSAN Disk Pool already exists"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusConflict, errorMessage)
		return
	}

	// Ksan Disk가 존재하는지 확인한다.
	isExist, err = ksanAgentConfig.isExistDisk(nickName)
	if err != nil {
		logger.Error(err.Error())
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	} else if isExist {
		// 이미 존재하면 에러를 출력한다.
		errorMessage := "KSAN Disk already exists"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusConflict, errorMessage)
		return
	}

	// Ksan User가 존재하는지 확인한다.
	isExist, err = ksanAgentConfig.isExistUser(nickName)
	if err != nil {
		logger.Error(err.Error())
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	} else if isExist {
		// 이미 존재하면 에러를 출력한다.
		errorMessage := "KSAN User already exists"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusConflict, errorMessage)
		return
	}

	format.JSON(w, http.StatusOK, "KSAN configuration check successfully")
	logger.Info("KSAN configuration check successfully")
	return
}

// @Summary Add KSAN Configuration
// @Description Add KSAN Configuration
// @Tags KSAN
// @Accept  json
// @Produce  json
// @Param body body KsanConfiguration true "Ksan Configuration"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/ksan/configuration [post]
func addKsanConfiguration(w http.ResponseWriter, r *http.Request) {
	// Request Log
	RequestLog := fmt.Sprintf("[%s] admin requested to add KSAN configuration", LogProcessName)
	UIRequestLog(RequestLog)

	// Request Body를 가져온다.
	ksanConfiguration := KsanConfiguration{}
	if err := json.NewDecoder(r.Body).Decode(&ksanConfiguration); err != nil {
		logger.Error(err.Error())
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// Ksan 설정 정보를 가져온다.
	ksanAgentConfig := KsanAgentConfig{}
	if err := ksanAgentConfig.Load(); err != nil {
		logger.Error(err.Error())
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// storage path를 가져온다.
	storagePath, err := getDatasetPath(ksanConfiguration.DatasetRefId)

	if err != nil {
		errorMessage := "Failed to get dataset path"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusInternalServerError, errorMessage)
		return
	}

	// NickName을 만든다.
	nickName, err := ksanConfiguration.getNickName()
	bucketName := strings.ReplaceAll(nickName, "_", "-")
	if err != nil {
		errorMessage := "Failed to get nickname"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusInternalServerError, errorMessage)
		return
	}

	// Ksan Disk Pool을 생성한다.
	err = ksanAgentConfig.addDiskPool(nickName)
	if err != nil {
		errorMessage := "Failed to add disk pool"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusInternalServerError, errorMessage)
		return
	}

	// Ksan Disk를 생성한다.
	err = ksanAgentConfig.addDisk(nickName, nickName, storagePath)
	if err != nil {
		errorMessage := "Failed to add disk"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusInternalServerError, errorMessage)
		return
	}

	// Ksan User를 생성한다.
	ksanUser, err := ksanAgentConfig.addUser(nickName, nickName)
	if err != nil {
		errorMessage := "Failed to add user"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusInternalServerError, errorMessage)
		return
	}

	// Ksan User에 Storage Class를 추가한다.
	addStorageClass := RequestAddStorageClass{
		UserId:       nickName,
		DiskPoolId:   ksanConfiguration.ArchiveName,
		StorageClass: "GLACIER",
	}
	err = ksanAgentConfig.addUserStorageClass(addStorageClass)
	if err != nil {
		errorMessage := "Failed to add user storage class"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusInternalServerError, errorMessage)
		return
	}

	// Ksan GW Configuration을 가져온다.
	ksanGWConfig, err := ksanAgentConfig.getKsanGWConfig()
	if err != nil {
		errorMessage := "Failed to get ksan gw configuration"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusInternalServerError, errorMessage)
		return
	}

	// ksan Endpoint를 가져온다.
	ksanS3URL := strings.ReplaceAll(ksanGWConfig.Endpoint, "0.0.0.0", "localhost")

	// s3 session 생성
	s3session, err := session.NewSession(&aws.Config{
		Region:           aws.String("us-west-2"),
		Endpoint:         aws.String(ksanS3URL),
		Credentials:      credentials.NewStaticCredentials(ksanUser.AccessKey, ksanUser.SecretKey, ""),
		S3ForcePathStyle: aws.Bool(true),
	})
	if err != nil {
		logger.Error(err.Error())
		errorMessage := "Failed to create s3 session"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusInternalServerError, errorMessage)
		return
	}
	svc := s3.New(s3session)

	// Bucket을 생성한다.
	_, err = svc.CreateBucket(&s3.CreateBucketInput{Bucket: &bucketName})
	if err != nil {
		logger.Error(err.Error())
		errorMessage := "Failed to create bucket"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusInternalServerError, errorMessage)
		return
	}

	// Bucket의 Lifecycle을 설정한다.
	_, err = svc.PutBucketLifecycleConfiguration(&s3.PutBucketLifecycleConfigurationInput{
		Bucket: &bucketName,
		LifecycleConfiguration: &s3.BucketLifecycleConfiguration{
			Rules: []*s3.LifecycleRule{
				{
					ID:     aws.String("Delete rule"),
					Status: aws.String("Enabled"),
					Transitions: []*s3.Transition{
						{
							Days:         aws.Int64(int64(ksanConfiguration.LifecycleDays)),
							StorageClass: aws.String(s3.StorageClassGlacier),
						},
					},
				},
			},
		},
	})
	if err != nil {
		logger.Error(err.Error())
		errorMessage := "Failed to put bucket lifecycle configuration"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusInternalServerError, errorMessage)
		return
	}

	// Ksan Configuration을 추가한다.
	ksanConfiguration.Id = uuid.New().String()
	ksanConfiguration.UpdateDate = time.Now()
	ksanConfiguration.Enable = "y"
	ksanConfiguration.AccessKey = ksanUser.AccessKey
	ksanConfiguration.SecretKey = ksanUser.SecretKey
	ksanConfiguration.BucketName = bucketName
	ksanConfiguration.DiskName = nickName
	ksanConfiguration.DiskPoolName = nickName
	ksanConfiguration.UserName = ksanUser.Name

	// DB에 저장한다.
	if err := db.Create(&ksanConfiguration).Error; err != nil {
		logger.Error(err.Error())
		errorMessage := "Failed to create ksan configuration"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusInternalServerError, errorMessage)
		return
	}

	KSANLogMessage(LogPriority.Info, "KSAN configuration added successfully")

	format.JSON(w, http.StatusOK, "KSAN configuration added successfully")
	return
}

// @Summary Update KSAN Configuration
// @Description Update KSAN Configuration
// @Tags KSAN
// @Accept  json
// @Produce  json
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/ksan/configuration [put]
func updateKsanConfiguration(w http.ResponseWriter, r *http.Request) {
	strLifecycleDays := chi.URLParam(r, "lifecycleDays")

	if strLifecycleDays == "" {
		format.JSON(w, http.StatusBadRequest, "lifecycleDays is empty")
		return
	}

	// Convert the requestBody to an integer
	lifecycleDays, err := strconv.Atoi(strLifecycleDays)
	if err != nil {
		logger.Error(err.Error())
		format.JSON(w, http.StatusBadRequest, "Invalid lifecycleDays value")
		return
	}

	// Ksan 설정 정보를 가져온다.
	ksanConfiguration := KsanConfiguration{}
	if err := db.First(&ksanConfiguration).Error; err != nil {
		logger.Error(err.Error())
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Ksan 설정 정보를 변경한다.
	ksanConfiguration.LifecycleDays = lifecycleDays
	db.Save(&ksanConfiguration)

	// Ksan Agent 설정 정보를 가져온다.
	ksanAgentConfig := KsanAgentConfig{}
	if err := ksanAgentConfig.Load(); err != nil {
		logger.Error(err.Error())
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Ksan GW Configuration을 가져온다.
	ksanGWConfig, err := ksanAgentConfig.getKsanGWConfig()
	if err != nil {
		errorMessage := "Failed to get ksan gw configuration"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusInternalServerError, errorMessage)
		return
	}

	// ksan Endpoint를 가져온다.
	ksanS3URL := strings.ReplaceAll(ksanGWConfig.Endpoint, "0.0.0.0", "localhost")

	// s3 session 생성
	s3session, err := session.NewSession(&aws.Config{
		Region:           aws.String("us-west-2"),
		Endpoint:         aws.String(ksanS3URL),
		Credentials:      credentials.NewStaticCredentials(ksanConfiguration.AccessKey, ksanConfiguration.SecretKey, ""),
		S3ForcePathStyle: aws.Bool(true),
	})
	if err != nil {
		logger.Error(err.Error())
		errorMessage := "Failed to create s3 session"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusInternalServerError, errorMessage)
		return
	}
	svc := s3.New(s3session)

	// Bucket의 Lifecycle을 설정한다.
	_, err = svc.PutBucketLifecycleConfiguration(&s3.PutBucketLifecycleConfigurationInput{
		Bucket: &ksanConfiguration.BucketName,
		LifecycleConfiguration: &s3.BucketLifecycleConfiguration{
			Rules: []*s3.LifecycleRule{
				{
					ID:     aws.String("Delete rule"),
					Status: aws.String("Enabled"),
					Transitions: []*s3.Transition{
						{
							Days:         aws.Int64(int64(ksanConfiguration.LifecycleDays)),
							StorageClass: aws.String(s3.StorageClassGlacier),
						},
					},
				},
			},
		},
	})
	if err != nil {
		logger.Error(err.Error())
		errorMessage := "Failed to put bucket lifecycle configuration"
		printToLog(LogPriority.Error, errorMessage)
		format.JSON(w, http.StatusInternalServerError, errorMessage)
		return
	}

	KSANLogMessage(LogPriority.Info, "KSAN configuration updated successfully")
	format.JSON(w, http.StatusOK, "KSAN configuration updated successfully")
}

func (k *KsanConfiguration) getNickName() (string, error) {
	// 호스트 이름을 가져온다.
	hostname, err := getHostName()
	if err != nil {
		logger.Error(err.Error())
		return "", err
	}
	// Pool 이름을 가져온다.
	var zFileSystem ZFileSystem
	if err := db.Where("Id = ?", k.DatasetRefId).First(&zFileSystem).Error; err != nil {
		logger.Error(err.Error())
		return "", err
	}
	var zPool ZPool
	if err := db.Where("Id = ?", zFileSystem.PoolRefId).First(&zPool).Error; err != nil {
		logger.Error(err.Error())
		return "", err
	}
	// NickName을 만든다.
	nickName := fmt.Sprintf("%s_%s_%s", hostname, zPool.Name, zFileSystem.Name)

	return nickName, nil
}

// 호스트 이름을 가져온다.
func getHostName() (string, error) {
	hostname, err := os.Hostname()
	if err != nil {
		return "", err
	}
	return hostname, nil
}

// Ksan 동작 여부 확인
func isKsanActiveCheck() (bool, error) {
	// check is active
	isKsanAgentActive, err := isKsanAgentActive()
	if err != nil {
		return false, err
	}

	isKsanGWActive, err := isKsanGWActive()
	if err != nil {
		return false, err
	}

	isKsanOSDActive, err := isKsanOSDActive()
	if err != nil {
		return false, err
	}

	if isKsanAgentActive && isKsanGWActive && isKsanOSDActive {
		return true, nil
	} else {
		return false, nil
	}
}
