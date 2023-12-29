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

	"gopkg.in/pygz/subprocess.v1"
)

type S3Configuration struct {
	Id             string    `json:"id" db:"Id"`
	Enable         string    `json:"enable" db:"Enable"` // "n": disable, "y": enable
	InterfaceName  *string   `json:"interface_name,omitempty" db:"InterfaceName"`
	HttpPort       int       `json:"http_port" db:"HttpPort"`
	HttpsPort      int       `json:"https_port" db:"HttpsPort"`
	DatasetRefId   *string   `json:"dataset_ref_id,omitempty" db:"DatasetRefId"`
	MaxThreads     int       `json:"max_threads" db:"MaxThreads"`
	MaxIdleTimeout int       `json:"max_idle_timeout" db:"MaxIdleTimeout"`
	MaxFileSize    int64     `json:"max_file_size" db:"MaxFileSize"`
	MaxTimeSkew    int       `json:"max_time_skew" db:"MaxTimeSkew"`
	UpdateDate     time.Time `json:"update_date" db:"UpdateDate"`
}

type S3ConfigurationGet struct {
	Id             string  `json:"id"`
	Enable         string  `json:"enable"` // "n": disable, "y": enable
	InterfaceName  *string `json:"interface_name,omitempty"`
	HttpPort       int     `json:"http_port"`
	HttpsPort      int     `json:"https_port"`
	MaxThreads     int     `json:"max_threads" db:"MaxThreads"`
	MaxIdleTimeout int     `json:"max_idle_timeout" db:"MaxIdleTimeout"`
	MaxFileSize    int64   `json:"max_file_size" db:"MaxFileSize"`
	MaxTimeSkew    int     `json:"max_time_skew" db:"MaxTimeSkew"`
	DatasetName    *string `json:"dataset_name,omitempty"`
	DatasetRefId   *string `json:"dataset_ref_id,omitempty"`
	PoolName       string  `json:"pool_name"`
	StoragePath    string  `json:"storage_path"`
}

// @Summary Get S3 Configuration
// @Description Get S3 Configuration
// @Tags S3
// @Accept  json
// @Produce  json
// @Success 200 {object} S3ConfigurationGet
// @Failure 500 {object} Response
// @Router /api/s3/configuration [get]
func getS3Configuration(w http.ResponseWriter, r *http.Request) {
	s3Configuration := S3Configuration{}
	query := "SELECT * FROM S3_CONF ORDER BY UpdateDate DESC LIMIT 1"
	err := conn.Get(&s3Configuration, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	if s3Configuration.DatasetRefId != nil {
		// select dataset name from dataset ref id
		var datasetName string
		query = fmt.Sprintf("SELECT Name FROM ZFILESYSTEMS WHERE Id = '%s'", *s3Configuration.DatasetRefId)
		err = conn.Get(&datasetName, query)

		if err != nil {
			if strings.Contains(err.Error(), "no rows in result set") {
				s3ConfigurationGet := S3ConfigurationGet{
					Id:             s3Configuration.Id,
					Enable:         s3Configuration.Enable,
					InterfaceName:  s3Configuration.InterfaceName,
					HttpPort:       s3Configuration.HttpPort,
					HttpsPort:      s3Configuration.HttpsPort,
					MaxThreads:     s3Configuration.MaxThreads,
					MaxIdleTimeout: s3Configuration.MaxIdleTimeout,
					MaxFileSize:    s3Configuration.MaxFileSize,
					MaxTimeSkew:    s3Configuration.MaxTimeSkew,
					DatasetName:    nil,
					DatasetRefId:   s3Configuration.DatasetRefId,
					PoolName:       "",
					StoragePath:    "",
				}

				format.JSON(w, http.StatusOK, s3ConfigurationGet)
				return
			} else {
				format.JSON(w, http.StatusInternalServerError, err.Error())
				return
			}
		} else {
			// select pool name from dataset ref id
			var poolName string
			query = fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = (SELECT PoolRefId FROM ZFILESYSTEMS WHERE Id = '%s')", *s3Configuration.DatasetRefId)
			err = conn.Get(&poolName, query)

			if err != nil {
				format.JSON(w, http.StatusInternalServerError, err.Error())
				return
			}

			storagePath, err := getDatasetPath(*s3Configuration.DatasetRefId)

			if err != nil {
				format.JSON(w, http.StatusInternalServerError, err.Error())
				return
			}

			s3ConfigurationGet := S3ConfigurationGet{
				Id:             s3Configuration.Id,
				Enable:         s3Configuration.Enable,
				InterfaceName:  s3Configuration.InterfaceName,
				HttpPort:       s3Configuration.HttpPort,
				HttpsPort:      s3Configuration.HttpsPort,
				MaxThreads:     s3Configuration.MaxThreads,
				MaxIdleTimeout: s3Configuration.MaxIdleTimeout,
				MaxFileSize:    s3Configuration.MaxFileSize,
				MaxTimeSkew:    s3Configuration.MaxTimeSkew,
				DatasetName:    &datasetName,
				DatasetRefId:   s3Configuration.DatasetRefId,
				PoolName:       poolName,
				StoragePath:    storagePath,
			}

			// systemctl status ifs-s3gw
			response := subprocess.Run("systemctl", "status", "ifs-s3gw")

			if response.ExitCode != 0 {
				s3ConfigurationGet.Enable = "n"
			} else {
				lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")
				for _, line := range lines {
					if strings.Contains(line, "Active: active (running)") {
						s3ConfigurationGet.Enable = "y"
						break
					}
				}
			}

			format.JSON(w, http.StatusOK, s3ConfigurationGet)
			return
		}
	} else {
		s3ConfigurationGet := S3ConfigurationGet{
			Id:             s3Configuration.Id,
			Enable:         s3Configuration.Enable,
			InterfaceName:  s3Configuration.InterfaceName,
			HttpPort:       s3Configuration.HttpPort,
			HttpsPort:      s3Configuration.HttpsPort,
			MaxThreads:     s3Configuration.MaxThreads,
			MaxIdleTimeout: s3Configuration.MaxIdleTimeout,
			MaxFileSize:    s3Configuration.MaxFileSize,
			MaxTimeSkew:    s3Configuration.MaxTimeSkew,
			DatasetName:    nil,
			DatasetRefId:   s3Configuration.DatasetRefId,
			PoolName:       "",
			StoragePath:    "",
		}

		format.JSON(w, http.StatusOK, s3ConfigurationGet)
	}

}

type S3ConfigurationPost struct {
	Enable         string `json:"enable" example:"y"` // "n": disable, "y": enable
	InterfaceName  string `json:"interface_name" example:"ens192"`
	HttpPort       int    `json:"http_port" example:"7171"`
	HttpsPort      int    `json:"https_port" example:"7554"`
	MaxThreads     int    `json:"max_threads" db:"MaxThreads" example:"1000"`
	MaxIdleTimeout int    `json:"max_idle_timeout" db:"MaxIdleTimeout" example:"60000"`
	MaxFileSize    int64  `json:"max_file_size" db:"MaxFileSize" example:"3221225472"`
	MaxTimeSkew    int    `json:"max_time_skew" db:"MaxTimeSkew" example:"9000"`
	DatasetRefId   string `json:"dataset_ref_id"`
}

// @Summary Add S3 Configuration
// @Description Add S3 Configuration
// @Tags S3
// @Accept  json
// @Produce  json
// @Param body body S3ConfigurationPost true "S3 Configuration"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/s3/configuration [post]
func addS3Configuration(w http.ResponseWriter, r *http.Request) {
	s3Configuration := S3ConfigurationPost{}
	err := json.NewDecoder(r.Body).Decode(&s3Configuration)
	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to update S3 configuration", LogProcessName, "admin")
	UIRequestLog(RequestLog)

	// select the last id
	var s3ConfId string
	query := "SELECT Id FROM S3_CONF ORDER BY Id DESC LIMIT 1"
	err = conn.Get(&s3ConfId, query)

	if err != nil {
		// if does not exist, add new entry
		query = fmt.Sprintf("INSERT INTO S3_CONF (Enable, InterfaceName, HttpPort, HttpsPort, DatasetRefId, MaxThreads, MaxIdleTimeout, MaxFileSize, MaxTimeSkew, UpdateDate) VALUES ('%s', '%s', %d, %d, '%s', %d, %d, %d, %d, '%s')",
			s3Configuration.Enable, s3Configuration.InterfaceName, s3Configuration.HttpPort, s3Configuration.HttpsPort, s3Configuration.DatasetRefId,
			s3Configuration.MaxThreads, s3Configuration.MaxIdleTimeout, s3Configuration.MaxFileSize, s3Configuration.MaxTimeSkew, time.Now().Format("2006-01-02 15:04:05"))
		_, err = conn.Exec(query)

		if err != nil {
			S3LogMessage(LogPriority.Error, s3LogMessageId.S3SetConfigFail)

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	} else {
		// if exists, update entry
		query = fmt.Sprintf("UPDATE S3_CONF SET Enable = '%s', InterfaceName = '%s', HttpPort = %d, HttpsPort = %d, DatasetRefId = '%s', MaxThreads = %d, MaxIdleTimeout = %d, MaxFileSize = %d, MaxTimeSkew = %d, UpdateDate = '%s' WHERE Id = '%s'",
			s3Configuration.Enable, s3Configuration.InterfaceName, s3Configuration.HttpPort, s3Configuration.HttpsPort, s3Configuration.DatasetRefId,
			s3Configuration.MaxThreads, s3Configuration.MaxIdleTimeout, s3Configuration.MaxFileSize, s3Configuration.MaxTimeSkew,
			time.Now().Format("2006-01-02 15:04:05"), s3ConfId)
		_, err = conn.Exec(query)

		if err != nil {
			S3LogMessage(LogPriority.Error, s3LogMessageId.S3SetConfigFail)

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	err = updateS3()

	if err != nil {
		S3LogMessage(LogPriority.Error, s3LogMessageId.S3SetConfigFail)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// chown 777 /pool1/dataset1
	storagePath, err := getDatasetPath(s3Configuration.DatasetRefId)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
	}

	response := subprocess.Run("chown", "777", storagePath)

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
	}

	if err != nil {
		S3LogMessage(LogPriority.Error, s3LogMessageId.S3SetConfigFail)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	S3LogMessage(LogPriority.Info, s3LogMessageId.S3SetConfig)

	format.JSON(w, http.StatusOK, "S3 configuration added successfully")
	return
}
