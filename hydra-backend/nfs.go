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
	"time"

	"github.com/go-chi/chi"
	"gopkg.in/pygz/subprocess.v1"
)

// swagger:model
type NFSConf struct {
	Id                 string    `json:"id" db:"Id"`
	UnixExtensions     string    `json:"unix_extensions" db:"UnixExtensions"`
	UnixPermission     string    `json:"unix_permission" db:"UnixPermission"`
	CustomPort         string    `json:"custom_port" db:"CustomPort"`
	CustomPortStatd    *int      `json:"custom_port_statd,omitempty" db:"CustomPortStatd"`
	CustomPortNlockmgr *int      `json:"custom_port_nlockmgr,omitempty" db:"CustomPortNlockmgr"`
	ReadPacketSize     int       `json:"read_packet_size" db:"ReadPacketSize"`
	WritePacketSize    int       `json:"write_packet_size" db:"WritePacketSize"`
	MaximumNFSProtocol string    `json:"maximum_nfs_protocol" db:"MaximumNFSProtocol"`
	NFSV4Domain        *string   `json:"nfs_v4_domain,omitempty" db:"NFSV4Domain"`
	ThreadCount        int       `json:"thread_count" db:"ThreadCount"`
	AnonuidRoot        int       `json:"anonuid_root" db:"AnonuidRoot"`
	AnonuidGuest       int       `json:"anonuid_guest" db:"AnonuidGuest"`
	AnongidRoot        int       `json:"anongid_root" db:"AnongidRoot"`
	AnongidGuest       int       `json:"anongid_guest" db:"AnongidGuest"`
	UpdateDate         time.Time `json:"update_date" db:"UpdateDate"`
}

// @Summary Get nfs config
// @Description Get nfs config
// @Tags nfs
// @Accept  json
// @Produce  json
// @Success 200 {object} NFSConf
// @Failure 500 {object} Response
// @Router /api/nfs/config [get]
func getNFSConf(w http.ResponseWriter, r *http.Request) {
	var conf NFSConf
	err := conn.Get(&conf, "SELECT * FROM NFS_GLOBAL_CONF ORDER BY UpdateDate DESC LIMIT 1")

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, conf)
}

type NFSConf_Post struct {
	Enable             string `json:"enable"`
	MaximumNFSProtocol string `json:"maximum_nfs_protocol"`
	ThreadCount        int    `json:"thread_count"`
}

// @Summary Update nfs config
// @Description Update nfs config
// @Tags nfs
// @Accept  json
// @Produce  json
// @Param nfs_conf body NFSConf_Post true "NFS config"
// @Success 200 {string} string	"Successfully updated"
// @Failure 500 {object} Response
// @Router /api/nfs/config [put]
func updateNFSConf(w http.ResponseWriter, r *http.Request) {
	var conf NFSConf_Post
	err := json.NewDecoder(r.Body).Decode(&conf)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// check if there is a record in NFS_GLOBAL_CONF and get its id
	var id string
	err = conn.Get(&id, "SELECT Id FROM NFS_GLOBAL_CONF ORDER BY UpdateDate DESC LIMIT 1")

	if err != nil {
		// insert NFS_GLOBAL_CONF
		query := fmt.Sprintf("INSERT INTO NFS_GLOBAL_CONF (Enable, MaximumNFSProtocol, ThreadCount) VALUES ('%s', '%s', %d)", conf.Enable, conf.MaximumNFSProtocol, conf.ThreadCount)
		_, err = conn.Exec(query)

		if err != nil {
			NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSConfigUpdateFail, LogVariables{})

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	} else {
		// update NFS_GLOBAL_CONF
		query := fmt.Sprintf("UPDATE NFS_GLOBAL_CONF SET MaximumNFSProtocol = '%s', ThreadCount = %d, UpdateDate = CURRENT_TIMESTAMP WHERE Id = (SELECT Id FROM NFS_GLOBAL_CONF ORDER BY UpdateDate DESC LIMIT 1)", conf.MaximumNFSProtocol, conf.ThreadCount)
		_, err = conn.Exec(query)

		if err != nil {
			NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSConfigUpdateFail, LogVariables{})

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	// update NFS_SERVICE
	if conf.Enable == "y" {
		subprocess.Run("systemctl", "enable", "nfs-server.service")
		response := subprocess.Run("systemctl", "start", "nfs-server.service")

		if response.ExitCode != 0 {
			NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSServiceStartFail, LogVariables{})

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
	} else {
		subprocess.Run("systemctl", "stop", "nfs-server.service")
		response := subprocess.Run("systemctl", "disable", "nfs-server.service")

		if response.ExitCode != 0 {
			NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSServiceStopFail, LogVariables{})

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
	}

	updateNFSService()

	NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSConfigUpdate, LogVariables{})

	format.JSON(w, http.StatusOK, "Successfully updated")
}

// @Summary Check if nfs service is active
// @Description Check if nfs service is active
// @Tags nfs
// @Accept  json
// @Produce  json
// @Success 200 {boolean} boolean
// @Failure 500 {object} Response
// @Router /api/nfs/config/service [get]
func isNFSActive(w http.ResponseWriter, r *http.Request) {
	// check if nfs service is active
	response := subprocess.Run("systemctl", "status", "nfs-server.service")

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusOK, false)
		return
	}

	format.JSON(w, http.StatusOK, true)
}

type Export struct {
	Id           string    `json:"id" db:"Id"`
	ExportName   string    `json:"export_name" db:"ExportName"`
	DatasetRefId string    `json:"dataset_ref_id" db:"DatasetRefId"`
	Enable       string    `json:"enabled" db:"Enable"`
	Comment      *string   `json:"comment,omitempty" db:"Comment"`
	UpdateDate   time.Time `json:"update_date" db:"UpdateDate"`
}

type Export_Get struct {
	Id          string  `json:"id"`
	ExportName  string  `json:"export_name"`
	DatasetPath string  `json:"dataset_path"`
	Enable      string  `json:"enabled"`
	Comment     *string `json:"comment,omitempty"`
}

// @Summary Get nfs exports
// @Description Get nfs exports
// @Tags nfs
// @Accept  json
// @Produce  json
// @Success 200 {array} Export_Get
// @Failure 500 {object} Response
// @Router /api/nfs/exports [get]
func getExports(w http.ResponseWriter, r *http.Request) {
	// get all rows from NFS_EXPORTS
	exports := []Export{}
	err := conn.Select(&exports, "SELECT * FROM NFS_EXPORTS")

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	exports_get := []Export_Get{}
	for _, export := range exports {
		var export_get Export_Get
		export_get.Id = export.Id
		export_get.ExportName = export.ExportName
		export_get.DatasetPath, err = getDatasetPath(export.DatasetRefId)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		export_get.Comment = export.Comment
		export_get.Enable = export.Enable
		exports_get = append(exports_get, export_get)
	}

	format.JSON(w, http.StatusOK, exports_get)
}

type Export_GetById struct {
	Id              string  `json:"id"`
	ExportName      string  `json:"export_name"`
	DatasetName     string  `json:"dataset_name"`
	StoragePoolName string  `json:"storage_pool_name"`
	StoragePath     string  `json:"storage_path"`
	Enable          string  `json:"enabled"`
	Comment         *string `json:"comment,omitempty"`
}

// @Summary Get nfs export by id
// @Description Get nfs export by id
// @Tags nfs
// @Accept  json
// @Produce  json
// @Param id path string true "id"
// @Success 200 {object} Export
// @Failure 500 {object} Response
// @Router /api/nfs/exports/{id} [get]
func getExportById(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// get row from NFS_EXPORTS
	var export Export
	query := fmt.Sprintf("SELECT * FROM NFS_EXPORTS WHERE Id = '%s'", id)
	err := conn.Get(&export, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	var export_json Export_GetById
	export_json.Id = export.Id
	export_json.ExportName = export.ExportName
	export_json.Comment = export.Comment
	export_json.Enable = export.Enable

	export_json.StoragePath, err = getDatasetPath(export.DatasetRefId)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// get dataset name
	var datasetName string
	query = fmt.Sprintf("SELECT Name FROM ZFILESYSTEMS WHERE Id = '%s'", export.DatasetRefId)
	err = conn.Get(&datasetName, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	export_json.DatasetName = datasetName

	// get pool name
	var poolName string
	query = fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = (SELECT PoolRefId FROM ZFILESYSTEMS WHERE Id = '%s')", export.DatasetRefId)
	err = conn.Get(&poolName, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	export_json.StoragePoolName = poolName

	format.JSON(w, http.StatusOK, export_json)
}

// @Summary Create nfs export
// @Description Create nfs export
// @Tags nfs
// @Accept  json
// @Produce  json
// @Param export_name path string true "export_name"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/nfs/export-name-taken/{export_name} [get]
func isExportNameTaken(w http.ResponseWriter, r *http.Request) {
	export_name := chi.URLParam(r, "export_name")

	// check if export name is taken
	var count int
	query := fmt.Sprintf("SELECT COUNT(*) FROM NFS_EXPORTS WHERE ExportName = '%s'", export_name)

	err := conn.Get(&count, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	if count > 0 {
		format.JSON(w, http.StatusOK, true)
	} else {
		format.JSON(w, http.StatusOK, false)
	}
}

type Export_Post struct {
	ExportName   string  `json:"export_name"`
	DatasetRefId string  `json:"dataset_ref_id"`
	Comment      *string `json:"comment,omitempty"`
	Enable       string  `json:"enabled"`
}

// @Summary Add nfs export
// @Description Add nfs export
// @Tags nfs
// @Accept  json
// @Produce  json
// @Param export body Export_Post true "export"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/nfs/exports [post]
func createExport(w http.ResponseWriter, r *http.Request) {
	// get request body
	var export_post Export_Post
	err := json.NewDecoder(r.Body).Decode(&export_post)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] user '%s' requested to create a new export", LogProcessName, "admin")
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: export_post.ExportName,
	}

	// insert into NFS_EXPORTS
	query := fmt.Sprintf("INSERT INTO NFS_EXPORTS (ExportName, DatasetRefId, Enable, Comment, UpdateDate) VALUES ('%s', '%s', '%s', '%s', '%s')",
		export_post.ExportName, export_post.DatasetRefId, export_post.Enable, *export_post.Comment, time.Now().Format("2006-01-02 15:04:05"))
	_, err = conn.Exec(query)

	if err != nil {
		NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSCreateExportFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// datasetPath, err := getDatasetPath(datasetRefId)

	// mkDir(datasetPath)

	if export_post.Enable == "y" {
		updateNFSExports()
	}

	// change chown of dataset
	// get dataset name
	var datasetName string
	query = fmt.Sprintf("SELECT Name FROM ZFILESYSTEMS WHERE Id = '%s'", export_post.DatasetRefId)
	err = conn.Get(&datasetName, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
	}

	// get pool name
	var poolName string
	query = fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = (SELECT PoolRefId FROM ZFILESYSTEMS WHERE Id = '%s')", export_post.DatasetRefId)
	err = conn.Get(&poolName, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
	}

	// chmod 777 /pool1/dataset1
	datasetPath := fmt.Sprintf("/%s/%s", poolName, datasetName)
	err = os.Chmod(datasetPath, 0777)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
	}

	NFSLogMessage(LogPriority.Info, nfsLogMessageId.NFSCreateExport, logVariables)

	format.JSON(w, http.StatusOK, "NFS Share added successfully")
}

type Export_Put struct {
	Comment *string `json:"comment,omitempty"`
	Enable  string  `json:"enabled"`
}

// @Summary Update nfs export
// @Description Update nfs export
// @Tags nfs
// @Accept  json
// @Produce  json
// @Param id path string true "id"
// @Param export body Export_Put true "export"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/nfs/exports/{id} [put]
func updateExportById(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// get request body
	var export_put Export_Put
	err := json.NewDecoder(r.Body).Decode(&export_put)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// select export name by id
	var exportName string
	query := fmt.Sprintf("SELECT ExportName FROM NFS_EXPORTS WHERE Id = '%s'", id)
	err = conn.Get(&exportName, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] user '%s' requested to update export '%s'", LogProcessName, "admin", exportName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: exportName,
	}

	// update NFS_EXPORTS
	query = fmt.Sprintf("UPDATE NFS_EXPORTS SET Enable = '%s', Comment = '%s', UpdateDate = '%s' WHERE Id = '%s'",
		export_put.Enable, *export_put.Comment, time.Now().Format("2006-01-02 15:04:05"), id)
	_, err = conn.Exec(query)

	if err != nil {
		NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSUpdateExportFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	if export_put.Enable == "y" {
		updateNFSExports()
	}

	NFSLogMessage(LogPriority.Info, nfsLogMessageId.NFSUpdateExport, logVariables)

	format.JSON(w, http.StatusOK, "NFS Share updated successfully")
}

// @Summary Enable or disable nfs export
// @Description Enable or disable nfs export
// @Tags nfs
// @Accept  json
// @Produce  json
// @Param id path string true "id"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/nfs/exports/{id}/toggle [put]
func toggleExport(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var export Export
	err := conn.Get(&export, fmt.Sprintf("SELECT * FROM NFS_EXPORTS WHERE Id = '%s'", id))

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// if pool is exported, return error
	var poolName string
	err = conn.Get(&poolName, fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = (SELECT PoolRefId FROM ZFILESYSTEMS WHERE Id = '%s')", export.DatasetRefId))

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

	RequestLog := fmt.Sprintf("[%s] user '%s' requested to (dis)enable export '%s'", LogProcessName, "admin", export.ExportName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: export.ExportName,
	}

	if export.Enable == "y" {
		query := fmt.Sprintf("UPDATE NFS_EXPORTS SET Enable = 'n' WHERE Id = '%s'", id)
		_, err = conn.Exec(query)

		if err != nil {
			NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSDisableExportFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		NFSLogMessage(LogPriority.Info, nfsLogMessageId.NFSDisableExport, logVariables)
	} else {
		query := fmt.Sprintf("UPDATE NFS_EXPORTS SET Enable = 'y' WHERE Id = '%s'", id)
		_, err = conn.Exec(query)

		if err != nil {
			NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSEnableExportFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		NFSLogMessage(LogPriority.Info, nfsLogMessageId.NFSEnableExport, logVariables)
	}

	updateNFSExports()

	format.JSON(w, http.StatusOK, "Export updated")
}

// @Summary Delete nfs export
// @Description Delete nfs export
// @Tags nfs
// @Accept  json
// @Produce  json
// @Param id path string true "id"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/nfs/exports/{id} [delete]
func deleteExportById(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// select export name by id
	var exportName string
	query := fmt.Sprintf("SELECT ExportName FROM NFS_EXPORTS WHERE Id = '%s'", id)
	err := conn.Get(&exportName, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] user '%s' requested to delete export '%s'", LogProcessName, "admin", exportName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: exportName,
	}

	// delete from NFS_EXPORTS_PERMISSIONS
	query = fmt.Sprintf("DELETE FROM NFS_EXPORTS_PERMISSIONS WHERE ExportRefId = '%s'", id)
	_, err = conn.Exec(query)

	if err != nil {
		NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSDeleteExportFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// save dataset ref id
	var datasetRefId string
	query = fmt.Sprintf("SELECT DatasetRefId FROM NFS_EXPORTS WHERE Id = '%s'", id)
	err = conn.Get(&datasetRefId, query)

	if err != nil {
		NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSDeleteExportFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// delete from NFS_EXPORTS
	query = fmt.Sprintf("DELETE FROM NFS_EXPORTS WHERE Id = '%s'", id)
	_, err = conn.Exec(query)

	if err != nil {
		NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSDeleteExportFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	updateNFSExports()

	NFSLogMessage(LogPriority.Info, nfsLogMessageId.NFSDeleteExport, logVariables)

	format.JSON(w, http.StatusOK, "NFS Share deleted successfully")
}

type NFSPermission struct {
	Id          string  `json:"id" db:"Id"`
	ExportRefId string  `json:"export_ref_id" db:"ExportRefId"`
	Enable      string  `json:"enabled" db:"Enable"`
	Privilege   string  `json:"privilege" db:"Privilege"`
	Client      string  `json:"client" db:"Client"`
	Async       string  `json:"async" db:"Async"`
	Crossmnt    string  `json:"crossmnt" db:"Crossmnt"`
	Insecure    string  `json:"insecure" db:"Insecure"`
	Squash      string  `json:"squash" db:"Squash"`
	Security    *string `json:"security,omitempty" db:"Security"`
	Comment     *string `json:"comment,omitempty" db:"Comment"`
	UpdateDate  string  `json:"update_date" db:"UpdateDate"`
}

// @Summary Get permissions by export id
// @Description Get permissions by export id
// @Tags nfs
// @Accept  json
// @Produce  json
// @Param id path string true "id"
// @Success 200 {array} NFSPermission
// @Failure 500 {object} Response
// @Router /api/nfs/exports/{id}/permissions [get]
func getPermissionsByExportId(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	permissions := []NFSPermission{}

	query := fmt.Sprintf("SELECT * FROM NFS_EXPORTS_PERMISSIONS WHERE ExportRefId = '%s'", id)
	err := conn.Select(&permissions, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, permissions)
}

// @Summary Get permission by permission id
// @Description Get permission by permission id
// @Tags nfs
// @Accept  json
// @Produce  json
// @Param id path string true "id"
// @Success 200 {object} NFSPermission
// @Failure 500 {object} Response
// @Router /api/nfs/exports/permissions/{id} [get]
func getPermissionByPermissionId(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	permission := NFSPermission{}

	query := fmt.Sprintf("SELECT * FROM NFS_EXPORTS_PERMISSIONS WHERE Id = '%s'", id)
	err := conn.Get(&permission, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, permission)
}

type NFSPermission_Post struct {
	ExportName string `json:"export_name"`
	Client     string `json:"client"`
	Privilege  string `json:"privilege"`
	Squash     string `json:"squash"`
	Async      string `json:"async"`
	Crossmnt   string `json:"crossmnt"`
	Insecure   string `json:"insecure"`
}

// @Summary Add permission
// @Description Add permission
// @Tags nfs
// @Accept  json
// @Produce  json
// @Param export body NFSPermission_Post true "export"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/nfs/exports/permissions [post]
func addPermission(w http.ResponseWriter, r *http.Request) {
	// get request body
	var permission_post NFSPermission_Post
	err := json.NewDecoder(r.Body).Decode(&permission_post)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] user '%s' requested to add permission for client '%s' in export '%s'", LogProcessName, "admin", permission_post.Client, permission_post.ExportName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: permission_post.ExportName,
		TargetName: permission_post.Client,
	}

	// get export id
	var exportId string
	query := fmt.Sprintf("SELECT Id FROM NFS_EXPORTS WHERE ExportName = '%s'", permission_post.ExportName)
	err = conn.Get(&exportId, query)

	if err != nil {
		NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSAddPermissionFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// insert into NFS_EXPORTS_PERMISSIONS
	query = fmt.Sprintf("INSERT INTO NFS_EXPORTS_PERMISSIONS (ExportRefId, Enable, Privilege, Client, Async, Crossmnt, Insecure, Squash, UpdateDate) VALUES ('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s')",
		exportId, "y", permission_post.Privilege, permission_post.Client, permission_post.Async, permission_post.Crossmnt, permission_post.Insecure, permission_post.Squash, time.Now().Format("2006-01-02 15:04:05"))
	_, err = conn.Exec(query)

	if err != nil {
		NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSAddPermissionFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	updateNFSExports()

	NFSLogMessage(LogPriority.Info, nfsLogMessageId.NFSAddPermission, logVariables)

	format.JSON(w, http.StatusOK, "Permission added successfully")
}

// @Summary Update permission
// @Description Update permission
// @Tags nfs
// @Accept  json
// @Produce  json
// @Param id path string true "id"
// @Param permission body NFSPermission_Post true "permission"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/nfs/exports/permissions/{id} [put]
func updatePermissionById(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// get request body
	var permission_post NFSPermission_Post
	err := json.NewDecoder(r.Body).Decode(&permission_post)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] user '%s' requested to update permission for client '%s' in export '%s'", LogProcessName, "admin", permission_post.Client, permission_post.ExportName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: permission_post.ExportName,
		TargetName: permission_post.Client,
	}

	// update NFS_EXPORTS_PERMISSIONS
	query := fmt.Sprintf("UPDATE NFS_EXPORTS_PERMISSIONS SET Privilege = '%s', Async = '%s', Crossmnt = '%s', Insecure = '%s', Squash = '%s', UpdateDate = '%s' WHERE Id = '%s'",
		permission_post.Privilege, permission_post.Async, permission_post.Crossmnt, permission_post.Insecure, permission_post.Squash, time.Now().Format("2006-01-02 15:04:05"), id)
	_, err = conn.Exec(query)

	if err != nil {
		NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSUpdatePermissionFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	updateNFSExports()

	NFSLogMessage(LogPriority.Info, nfsLogMessageId.NFSUpdatePermission, logVariables)

	format.JSON(w, http.StatusOK, "Permission updated successfully")

}

// @Summary Enable or disable permission
// @Description Enable or disable permission
// @Tags nfs
// @Accept  json
// @Produce  json
// @Param id path string true "id"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/nfs/exports/permissions/{id}/toggle [put]
func togglePermission(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var permission NFSPermission
	err := conn.Get(&permission, fmt.Sprintf("SELECT * FROM NFS_EXPORTS_PERMISSIONS WHERE Id = '%s'", id))

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	if permission.Enable == "y" {
		query := fmt.Sprintf("UPDATE NFS_EXPORTS_PERMISSIONS SET Enable = 'n' WHERE Id = '%s'", id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	} else {
		query := fmt.Sprintf("UPDATE NFS_EXPORTS_PERMISSIONS SET Enable = 'y' WHERE Id = '%s'", id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	updateNFSExports()

	format.JSON(w, http.StatusOK, "Export permission updated")
}

// @Summary Delete permission by id
// @Description Delete permission by id
// @Tags nfs
// @Accept  json
// @Produce  json
// @Param id path string true "id"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/nfs/exports/permissions/{id} [delete]
func deletePermissionById(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// select client by id
	var client string
	query := fmt.Sprintf("SELECT Client FROM NFS_EXPORTS_PERMISSIONS WHERE Id = '%s'", id)
	err := conn.Get(&client, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// select export name by id
	var exportName string
	query = fmt.Sprintf("SELECT ExportName FROM NFS_EXPORTS WHERE Id = (SELECT ExportRefId FROM NFS_EXPORTS_PERMISSIONS WHERE Id = '%s')", id)
	err = conn.Get(&exportName, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] user '%s' requested to delete permission for client '%s' in export '%s'", LogProcessName, "admin", client, exportName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: exportName,
		TargetName: client,
	}

	// delete from NFS_EXPORTS_PERMISSIONS
	query = fmt.Sprintf("DELETE FROM NFS_EXPORTS_PERMISSIONS WHERE Id = '%s'", id)
	_, err = conn.Exec(query)

	if err != nil {
		NFSLogMessage(LogPriority.Error, nfsLogMessageId.NFSDeletePermissionFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	updateNFSExports()

	NFSLogMessage(LogPriority.Info, nfsLogMessageId.NFSDeletePermission, logVariables)

	format.JSON(w, http.StatusOK, "Permission deleted successfully")
}
