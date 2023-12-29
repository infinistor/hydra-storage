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
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi"
	"gopkg.in/pygz/subprocess.v1"
)

func (ZFileSystem) TableName() string { return "ZFILESYSTEMS" }

type ZFileSystem struct {
	Id          string  `gorm:"primaryKey;type:char(36)" json:"id" db:"Id"`
	Name        string  `gorm:"size:256" json:"name" db:"Name"`
	PoolRefId   string  `gorm:"type:char(36)" json:"pool_ref_id" db:"PoolRefId"`
	Used        string  `gorm:"size:10" json:"used" db:"Used"`
	Available   string  `gorm:"size:10" json:"available" db:"Available"`
	Compression string  `gorm:"size:10" json:"compression" db:"Compression"`
	Refer       string  `gorm:"size:10" json:"refer" db:"Refer"`
	Quota       string  `gorm:"size:10" json:"quota" db:"Quota"`
	Reservation string  `gorm:"size:10" json:"reservation" db:"Reservation"`
	RecordSize  string  `gorm:"size:10" json:"record_size" db:"RecordSize"`
	Dedup       string  `gorm:"size:3" json:"dedup" db:"Dedup"`
	Comment     *string `gorm:"size:256" json:"comment,omitempty" db:"Comment"`
}

// @Summary Get Filesystems by Pool ID
// @Description Get Filesystems by Pool ID
// @Tags storage
// @Accept  json
// @Produce  json
// @Param id path string true "Pool ID"
// @Success 200 {array} ZFileSystem
// @Failure 500 {object} Response
// @Router /api/storage/pools/{id}/filesystems [get]
func getZFilesystems(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// select * from ZFILESYSTEMS table where PoolRefId = id
	zFilesystems := []ZFileSystem{}
	query := fmt.Sprintf("SELECT * FROM ZFILESYSTEMS WHERE PoolRefId = '%s'", id)
	err := conn.Select(&zFilesystems, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// get pool name from ZPOOLS table
	var pool_name string
	query = fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", id)
	err = conn.QueryRow(query).Scan(&pool_name)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// check if the values of each dataset are up to date
	for _, zFilesystem := range zFilesystems {
		// zfs list -H -o used,avail,refer tank/test
		response := subprocess.Run("sudo", "zfs", "list", "-H", "-o", "used,avail,refer", pool_name+"/"+zFilesystem.Name)

		if response.ExitCode != 0 {
			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}

		// update ZFILESYSTEMS table
		zfsList := strings.Split(strings.TrimSpace(response.StdOut), "\t")

		query = fmt.Sprintf("UPDATE ZFILESYSTEMS SET Used = '%s', Available = '%s', Refer = '%s' WHERE Id = '%s'", zfsList[0], zfsList[1], zfsList[2], zFilesystem.Id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	query = fmt.Sprintf("SELECT * FROM ZFILESYSTEMS WHERE PoolRefId = '%s' ORDER BY Name ASC", id)
	err = conn.Select(&zFilesystems, query)

	format.JSON(w, http.StatusOK, zFilesystems)
}

// @Summary Get Filesystem by ID
// @Description Get Filesystem by ID
// @Tags storage
// @Accept  json
// @Produce  json
// @Param id path string true "Filesystem ID"
// @Success 200 {object} ZFileSystem
// @Failure 500 {object} Response
// @Router /api/storage/filesystems/{id} [get]
func getZFilesystemById(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// select * from ZFILESYSTEMS table where Id = id
	var zFilesystem ZFileSystem
	query := fmt.Sprintf("SELECT * FROM ZFILESYSTEMS WHERE Id = '%s'", id)
	err := conn.Get(&zFilesystem, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// get pool name from ZPOOLS table
	var pool_name string
	query = fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = (SELECT PoolRefId FROM ZFILESYSTEMS WHERE Id = '%s')", id)
	err = conn.QueryRow(query).Scan(&pool_name)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// zfs list -H -o used,avail,refer tank/test
	response := subprocess.Run("sudo", "zfs", "list", "-H", "-o", "used,avail,refer", pool_name+"/"+zFilesystem.Name)

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	// update ZFILESYSTEMS table
	zfsList := strings.Split(strings.TrimSpace(response.StdOut), "\t")

	query = fmt.Sprintf("UPDATE ZFILESYSTEMS SET Used = '%s', Available = '%s', Refer = '%s' WHERE Id = '%s'", zfsList[0], zfsList[1], zfsList[2], zFilesystem.Id)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	query = fmt.Sprintf("SELECT * FROM ZFILESYSTEMS WHERE Id = '%s'", id)
	err = conn.Get(&zFilesystem, query)

	format.JSON(w, http.StatusOK, zFilesystem)
}

type ZFilesystem_Post struct {
	Name        string  `json:"name" db:"Name"`
	Compression string  `json:"compression" db:"Compression"`
	Quota       string  `json:"quota" db:"Quota"`
	Reservation string  `json:"reservation" db:"Reservation"`
	RecordSize  string  `json:"record_size" db:"RecordSize"`
	Dedup       string  `json:"dedup" db:"Dedup"`
	Comment     *string `json:"comment,omitempty" db:"Comment"`
}

// @Summary Create Filesystem
// @Description Create Filesystem
// @Tags storage
// @Accept  json
// @Produce  json
// @Param id path string true "Pool ID"
// @Param filesystem body ZFilesystem_Post true "Filesystem"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/storage/pools/{id}/filesystems [post]
func createZFilesystem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var zFilesystem ZFilesystem_Post
	err := json.NewDecoder(r.Body).Decode(&zFilesystem)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// select Name from ZPOOLS table where Id = id
	var pool_name string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", id)
	err = conn.QueryRow(query).Scan(&pool_name)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to create dataset '%s'", LogProcessName, "admin", zFilesystem.Name)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: zFilesystem.Name,
		TargetName: pool_name,
	}

	// zfs create -o quota=10G -o reservation=10G tank/test
	response := subprocess.Run("sudo", "zfs", "create",
		"-o", "quota="+zFilesystem.Quota,
		"-o", "reservation="+zFilesystem.Reservation,
		"-o", "xattr=sa",
		"-o", "compression="+zFilesystem.Compression,
		"-o", "recordsize="+zFilesystem.RecordSize,
		"-o", "dedup="+zFilesystem.Dedup,
		pool_name+"/"+zFilesystem.Name)

	if response.ExitCode != 0 {
		subprocess.Run("sudo", "zfs", "destroy", pool_name+"/"+zFilesystem.Name)

		ZFileSystemLogMessage(LogPriority.Error, zFileSystemLogMessageId.ZFileSystemCreateFail, logVariables)

		// 	fmt.Println(response.StdErr)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	// // insert into ZFILESYSTEMS table
	query = fmt.Sprintf("INSERT INTO ZFILESYSTEMS (Name, PoolRefId, Compression, Quota, Reservation, RecordSize, Dedup) VALUES ('%s', '%s', '%s', '%s', '%s', '%s', '%s')", zFilesystem.Name, id, zFilesystem.Compression, zFilesystem.Quota, zFilesystem.Reservation, zFilesystem.RecordSize, zFilesystem.Dedup)
	_, err = conn.Exec(query)

	if err != nil {
		// zfs destroy tank/test
		subprocess.Run("sudo", "zfs", "destroy", pool_name+"/"+zFilesystem.Name)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	if zFilesystem.Comment != nil {
		// update ZFILESYSTEMS table
		query = fmt.Sprintf("UPDATE ZFILESYSTEMS SET Comment = '%s' WHERE Name = '%s' AND PoolRefId = '%s'", *zFilesystem.Comment, zFilesystem.Name, id)
		_, err = conn.Exec(query)

		if err != nil {
			// zfs destroy tank/test
			subprocess.Run("sudo", "zfs", "destroy", pool_name+"/"+zFilesystem.Name)

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	// get id from ZFILESYSTEMS table
	var zFilesystemId string

	query = fmt.Sprintf("SELECT Id FROM ZFILESYSTEMS WHERE Name = '%s' AND PoolRefId = '%s'", zFilesystem.Name, id)
	err = conn.QueryRow(query).Scan(&zFilesystemId)

	if err != nil {
		// zfs destroy tank/test
		subprocess.Run("sudo", "zfs", "destroy", pool_name+"/"+zFilesystem.Name)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// zfs list -H -o used,avail,refer tank/test
	response = subprocess.Run("sudo", "zfs", "list", "-H", "-o", "used,avail,refer", pool_name+"/"+zFilesystem.Name)

	if response.ExitCode != 0 {
		// zfs destroy tank/test
		subprocess.Run("sudo", "zfs", "destroy", pool_name+"/"+zFilesystem.Name)

		// delete from ZFILESYSTEMS table
		query = fmt.Sprintf("DELETE FROM ZFILESYSTEMS WHERE Id = '%s'", zFilesystemId)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	// update ZFILESYSTEMS table
	zfsList := strings.Split(response.StdOut, "\t")

	fmt.Println(zfsList)

	query = fmt.Sprintf("UPDATE ZFILESYSTEMS SET Used = '%s', Available = '%s', Refer = '%s' WHERE Id = '%s'", zfsList[0], zfsList[1], zfsList[2], zFilesystemId)
	_, err = conn.Exec(query)

	if err != nil {
		// zfs destroy tank/test
		subprocess.Run("sudo", "zfs", "destroy", pool_name+"/"+zFilesystem.Name)

		// delete from ZFILESYSTEMS table
		query = fmt.Sprintf("DELETE FROM ZFILESYSTEMS WHERE Id = '%s'", zFilesystemId)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	ZFileSystemLogMessage(LogPriority.Info, zFileSystemLogMessageId.ZFileSystemCreate, logVariables)
	format.JSON(w, http.StatusOK, "Filesystem created")
}

type ZFileSystem_Modify struct {
	Compression string  `json:"compression"`
	Quota       string  `json:"quota"`
	Reservation string  `json:"reservation"`
	RecordSize  string  `json:"record_size"`
	Dedup       string  `json:"dedup"`
	Comment     *string `json:"comment,omitempty"`
}

// @Title Modify Filesystem
// @Description Modify Filesystem
// @Tags storage
// @Accept  json
// @Produce  json
// @Param id path string true "Filesystem ID"
// @Param modify_body body ZFileSystem_Modify true "Modify Filesystem"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/storage/filesystems/{id} [put]
func modifyZFilesystem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var zFilesystemModify ZFileSystem_Modify
	err := json.NewDecoder(r.Body).Decode(&zFilesystemModify)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// get dataset path
	dataset_path, err := getDatasetPath(id)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	dataset_path = dataset_path[1:]

	// zfs set compression=lz4 tank/test
	if zFilesystemModify.Compression != "" {
		response := subprocess.Run("sudo", "zfs", "set", "compression="+zFilesystemModify.Compression, dataset_path)

		if response.ExitCode != 0 {
			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}

		// update ZFILESYSTEMS table
		query := fmt.Sprintf("UPDATE ZFILESYSTEMS SET Compression = '%s' WHERE Id = '%s'", zFilesystemModify.Compression, id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	// zfs set quota=1G tank/test
	if zFilesystemModify.Quota != "" {
		response := subprocess.Run("sudo", "zfs", "set", "quota="+zFilesystemModify.Quota, dataset_path)

		if response.ExitCode != 0 {
			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}

		// update ZFILESYSTEMS table
		query := fmt.Sprintf("UPDATE ZFILESYSTEMS SET Quota = '%s' WHERE Id = '%s'", zFilesystemModify.Quota, id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	// zfs set reservation=1G tank/test
	if zFilesystemModify.Reservation != "" {
		response := subprocess.Run("sudo", "zfs", "set", "reservation="+zFilesystemModify.Reservation, dataset_path)

		if response.ExitCode != 0 {
			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}

		// update ZFILESYSTEMS table
		query := fmt.Sprintf("UPDATE ZFILESYSTEMS SET Reservation = '%s' WHERE Id = '%s'", zFilesystemModify.Reservation, id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	// zfs set recordsize=128K tank/test
	if zFilesystemModify.RecordSize != "" {
		response := subprocess.Run("sudo", "zfs", "set", "recordsize="+zFilesystemModify.RecordSize, dataset_path)

		if response.ExitCode != 0 {
			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}

		// update ZFILESYSTEMS table
		query := fmt.Sprintf("UPDATE ZFILESYSTEMS SET RecordSize = '%s' WHERE Id = '%s'", zFilesystemModify.RecordSize, id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	// zfs set dedup=on tank/test
	if zFilesystemModify.Dedup != "" {
		response := subprocess.Run("sudo", "zfs", "set", "dedup="+zFilesystemModify.Dedup, dataset_path)

		if response.ExitCode != 0 {
			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}

		// update ZFILESYSTEMS table
		query := fmt.Sprintf("UPDATE ZFILESYSTEMS SET Dedup = '%s' WHERE Id = '%s'", zFilesystemModify.Dedup, id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	// zfs set comment="test" tank/test
	if zFilesystemModify.Comment != nil {
		// update ZFILESYSTEMS table
		query := fmt.Sprintf("UPDATE ZFILESYSTEMS SET Comment = '%s' WHERE Id = '%s'", *zFilesystemModify.Comment, id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	format.JSON(w, http.StatusOK, "Filesystem modified successfully")
}

// @Summary Delete Filesystem
// @Description Delete Filesystem
// @Tags storage
// @Accept  json
// @Produce  json
// @Param id path string true "Pool ID"
// @Param filesystem_id path string true "Filesystem ID"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/storage/pools/{id}/filesystems/{filesystem_id} [delete]
func deleteZFilesystem(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	filesystem_id := chi.URLParam(r, "filesystem_id")

	// select Name from ZPOOLS table where Id = id
	var pool_name string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", id)
	err := conn.QueryRow(query).Scan(&pool_name)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// select Name from ZFILESYSTEMS table where Id = filesystem_id
	var filesystem_name string
	query = fmt.Sprintf("SELECT Name FROM ZFILESYSTEMS WHERE Id = '%s'", filesystem_id)
	err = conn.QueryRow(query).Scan(&filesystem_name)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to delete dataset '%s'", LogProcessName, "admin", filesystem_name)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: filesystem_name,
		TargetName: pool_name,
	}

	err = deleteSMBShareByDatasetRefId(filesystem_id)

	if err != nil {
		ZFileSystemLogMessage(LogPriority.Error, zFileSystemLogMessageId.ZFileSystemDestroyFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	err = deleteNFSExportByDatasetRefId(filesystem_id)

	if err != nil {
		ZFileSystemLogMessage(LogPriority.Error, zFileSystemLogMessageId.ZFileSystemDestroyFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	err = deleteS3ConfigByDatasetRefId(filesystem_id)

	if err != nil {
		ZFileSystemLogMessage(LogPriority.Error, zFileSystemLogMessageId.ZFileSystemDestroyFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// delete from ZSNAPSHOTS where DatasetRefId = filesystem_id
	query = fmt.Sprintf("DELETE FROM ZSNAPSHOTS WHERE DatasetRefId = '%s'", filesystem_id)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	var filesystem ZFileSystem
	query = fmt.Sprintf("SELECT * FROM ZFILESYSTEMS WHERE Id = '%s'", filesystem_id)
	conn.Get(&filesystem, query)

	// delete from ZFILESYSTEMS table
	query = fmt.Sprintf("DELETE FROM ZFILESYSTEMS WHERE Id = '%s'", filesystem_id)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// zfs destroy tank/test
	response := subprocess.Run("sudo", "zfs", "destroy", "-Rr", pool_name+"/"+filesystem_name)

	if response.ExitCode != 0 {
		if filesystem != (ZFileSystem{}) {
			// insert into ZFILESYSTEMS table
			query = fmt.Sprintf("INSERT INTO ZFILESYSTEMS (Id, Name, PoolRefId, Compression, Quota, Reservation, RecordSize, Dedup, Comment) VALUES ('%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s')", filesystem.Id, filesystem.Name, filesystem.PoolRefId, filesystem.Compression, filesystem.Quota, filesystem.Reservation, filesystem.RecordSize, filesystem.Dedup)
			conn.Exec(query)

			if filesystem.Comment != nil {
				// update ZFILESYSTEMS table
				query = fmt.Sprintf("UPDATE ZFILESYSTEMS SET Comment = '%s' WHERE Id = '%s'", *filesystem.Comment, filesystem.Id)
				conn.Exec(query)
			}
		}

		ZFileSystemLogMessage(LogPriority.Error, zFileSystemLogMessageId.ZFileSystemDestroyFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	ZFileSystemLogMessage(LogPriority.Info, zFileSystemLogMessageId.ZFileSystemDestroy, logVariables)
	format.JSON(w, http.StatusOK, "Filesystem deleted")
}

func deleteSMBShareByDatasetRefId(datasetRefId string) error {
	// select share id from SMB_SHARES table where DatasetRefId = datasetRefId
	var smbShareId string
	query := fmt.Sprintf("SELECT Id FROM SMB_SHARES WHERE DatasetRefId = '%s'", datasetRefId)
	err := conn.QueryRow(query).Scan(&smbShareId)

	if err != nil {
		// no share found
		return nil
	}

	// DELETE FROM SMB_USER_MAP WHERE ShareRefId = smbShareId
	query = fmt.Sprintf("DELETE FROM SMB_USER_MAP WHERE ShareRefId = '%s'", smbShareId)
	_, err = conn.Exec(query)

	if err != nil {
		return err
	}

	// DELETE FROM SMB_GROUP_MAP WHERE ShareRefId = smbShareId
	query = fmt.Sprintf("DELETE FROM SMB_GROUP_MAP WHERE ShareRefId = '%s'", smbShareId)
	_, err = conn.Exec(query)

	if err != nil {
		return err
	}

	// DELETE FROM SMB_SHARES WHERE Id = smbShareId
	query = fmt.Sprintf("DELETE FROM SMB_SHARES WHERE Id = '%s'", smbShareId)
	_, err = conn.Exec(query)

	if err != nil {
		return err
	}

	updateSMB()

	return nil
}

func deleteNFSExportByDatasetRefId(datasetRefId string) error {
	// select export id from NFS_EXPORTS table where DatasetRefId = datasetRefId
	var nfsExportId string
	query := fmt.Sprintf("SELECT Id FROM NFS_EXPORTS WHERE DatasetRefId = '%s'", datasetRefId)
	err := conn.QueryRow(query).Scan(&nfsExportId)

	if err != nil {
		// no export found
		return nil
	}

	// delete from NFS_EXPORTS_PERMISSIONS
	query = fmt.Sprintf("DELETE FROM NFS_EXPORTS_PERMISSIONS WHERE ExportRefId = '%s'", nfsExportId)
	_, err = conn.Exec(query)

	if err != nil {
		return err
	}

	// delete from NFS_EXPORTS
	query = fmt.Sprintf("DELETE FROM NFS_EXPORTS WHERE Id = '%s'", nfsExportId)
	_, err = conn.Exec(query)

	if err != nil {
		return err
	}

	updateNFSExports()

	return nil
}

func deleteS3ConfigByDatasetRefId(datasetRefId string) error {
	// select config id from S3_CONFtable where DatasetRefId = datasetRefId
	var s3ConfigId string
	query := fmt.Sprintf("SELECT Id FROM S3_CONF WHERE DatasetRefId = '%s'", datasetRefId)
	err := conn.QueryRow(query).Scan(&s3ConfigId)

	if err != nil {
		// no config found
		return nil
	}

	// delete from S3_CONFIGS
	query = fmt.Sprintf("DELETE FROM S3_CONFIGS WHERE Id = '%s'", s3ConfigId)
	_, err = conn.Exec(query)

	if err != nil {
		return err
	}

	response := subprocess.Run("systemctl", "stop", "ifs-s3gw")

	if response.ExitCode != 0 {
		return errors.New(response.StdErr)
	}

	return nil
}

type ZFilesystemCheckService struct {
	Used    bool    `json:"used"`
	Service *string `json:"service,omitempty"`
}

// @Summary Check if Filesystem is used by a service
// @Description Check if Filesystem is used by a service
// @Tags storage
// @Accept  json
// @Produce  json
// @Param id path string true "Filesystem ID"
// @Success 200 {object} ZFilesystemCheckService
// @Failure 500 {object} Response
// @Router /api/storage/filesystems/{id}/services [get]
func checkIfDatasetIsUsedByService(w http.ResponseWriter, r *http.Request) {
	// get dataset id from url
	id := chi.URLParam(r, "id")

	var services []string
	used := false

	// check if there are entries in S3_CONF table with DatasetRefId = id
	var s3ConfId string
	query := fmt.Sprintf("SELECT Id FROM S3_CONF WHERE DatasetRefId = '%s'", id)
	err := conn.QueryRow(query).Scan(&s3ConfId)

	if err == nil {
		service := "S3"
		// check if "S3" is in services, if not append it
		if !strings.Contains(strings.Join(services, ","), service) {
			services = append(services, service)
		}
		used = true
	}

	// check if there are entries in NFS_EXPORTS table with DatasetRefId = id
	var nfsShareId string
	query = fmt.Sprintf("SELECT Id FROM NFS_EXPORTS WHERE DatasetRefId = '%s'", id)
	err = conn.QueryRow(query).Scan(&nfsShareId)

	if err == nil {
		service := "NFS"
		// check if "NFS" is in services, if not append it
		if !strings.Contains(strings.Join(services, ","), service) {
			services = append(services, service)
		}
		used = true
	}

	// check if there are entries in SMB_SHARES table with DatasetRefId = id
	var smbShareId string
	query = fmt.Sprintf("SELECT Id FROM SMB_SHARES WHERE DatasetRefId = '%s'", id)
	err = conn.QueryRow(query).Scan(&smbShareId)

	if err == nil {
		service := "SMB"
		// check if "SMB" is in services, if not append it
		if !strings.Contains(strings.Join(services, ","), service) {
			services = append(services, service)
		}
		used = true
	}

	servicesString := strings.Join(services, ",")

	// if no entries found in any of the tables above, return false
	format.JSON(w, http.StatusOK, ZFilesystemCheckService{Used: used, Service: &servicesString})
}

type ZFilesystemCheckName struct {
	DatasetName string `json:"dataset_name"`
	PoolName    string `json:"pool_name"`
}

// @Summary Check if Filesystem name is available
// @Description Check if Filesystem name is available
// @Tags storage
// @Accept  json
// @Produce  json
// @Param body body ZFilesystemCheckName true "Filesystem name"
// @Success 200 {boolean} boolean
// @Failure 500 {object} Response
// @Router /api/storage/filesystems/check [post]
func checkIfDatasetNameAvailable(w http.ResponseWriter, r *http.Request) {
	var zFilesystemCheck ZFilesystemCheckName
	err := json.NewDecoder(r.Body).Decode(&zFilesystemCheck)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// check if dataset exists in zfs
	response := subprocess.Run("sudo", "zfs", "list", "-H", "-o", "name", fmt.Sprintf("%s/%s", zFilesystemCheck.PoolName, zFilesystemCheck.DatasetName))
	if response.ExitCode != 0 {
		format.JSON(w, http.StatusOK, true)
		return
	}

	format.JSON(w, http.StatusOK, false)
}

type ZFilesystemClone struct {
	SnapshotFullPath string  `json:"snapshot_full_path"`
	PoolRefId        string  `json:"pool_ref_id"`
	DatasetName      string  `json:"dataset_name"`
	Compression      string  `json:"compression"`
	Quota            string  `json:"quota"`
	Reservation      string  `json:"reservation"`
	RecordSize       string  `json:"record_size"`
	Comment          *string `json:"comment,omitempty"`
}

// @Summary Clone Filesystem from Snapshot
// @Description Clone Filesystem from Snapshot
// @Tags storage
// @Accept  json
// @Produce  json
// @Param body body ZFilesystemClone true "Filesystem clone"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/storage/filesystems/clone [post]
func cloneDatasetFromSnapshot(w http.ResponseWriter, r *http.Request) {
	var zFilesystemClone ZFilesystemClone
	err := json.NewDecoder(r.Body).Decode(&zFilesystemClone)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// get pool name from db
	var poolName string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", zFilesystemClone.PoolRefId)
	err = conn.QueryRow(query).Scan(&poolName)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to clone snapshot '%s' to dataset '%s'", LogProcessName, "admin", zFilesystemClone.SnapshotFullPath, zFilesystemClone.DatasetName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName:   zFilesystemClone.SnapshotFullPath,
		TargetValues: []string{zFilesystemClone.DatasetName, poolName},
	}

	// check if dataset exists in zfs
	response := subprocess.Run("sudo", "zfs", "list", "-H", "-o", "name", fmt.Sprintf("%s/%s", zFilesystemClone.PoolRefId, zFilesystemClone.DatasetName))
	if response.ExitCode == 0 {
		ZSnapshotLogMessage(LogPriority.Error, zSnapshotLogMessageId.ZSnapshotCloneFail, logVariables)

		format.JSON(w, http.StatusBadRequest, "Dataset already exists")
		return
	}

	// check if snapshot exists in zfs
	response = subprocess.Run("sudo", "zfs", "list", "-H", "-o", "name", zFilesystemClone.SnapshotFullPath)
	if response.ExitCode != 0 {
		ZSnapshotLogMessage(LogPriority.Error, zSnapshotLogMessageId.ZSnapshotCloneFail, logVariables)

		format.JSON(w, http.StatusBadRequest, "Snapshot does not exist")
		return
	}

	// create dataset
	response = subprocess.Run("sudo", "zfs", "clone", "-o", fmt.Sprintf("compression=%s", zFilesystemClone.Compression), "-o", fmt.Sprintf("quota=%s", zFilesystemClone.Quota), "-o", fmt.Sprintf("reservation=%s", zFilesystemClone.Reservation), "-o", fmt.Sprintf("recordsize=%s", zFilesystemClone.RecordSize), zFilesystemClone.SnapshotFullPath, fmt.Sprintf("%s/%s", poolName, zFilesystemClone.DatasetName))
	if response.ExitCode != 0 {
		ZSnapshotLogMessage(LogPriority.Error, zSnapshotLogMessageId.ZSnapshotCloneFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	// insert into db
	query = fmt.Sprintf("INSERT INTO ZFILESYSTEMS (Name, PoolRefId, Compression, Quota, Reservation, RecordSize, Comment) VALUES ('%s', '%s', '%s', '%s', '%s', '%s', '%s')", zFilesystemClone.DatasetName, zFilesystemClone.PoolRefId, zFilesystemClone.Compression, zFilesystemClone.Quota, zFilesystemClone.Reservation, zFilesystemClone.RecordSize, *zFilesystemClone.Comment)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// get id from ZFILESYSTEMS table
	var zFilesystemId string

	query = fmt.Sprintf("SELECT Id FROM ZFILESYSTEMS WHERE Name = '%s' AND PoolRefId = '%s'", zFilesystemClone.DatasetName, zFilesystemClone.PoolRefId)
	err = conn.QueryRow(query).Scan(&zFilesystemId)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// zfs list -H -o used,avail,refer tank/test
	response = subprocess.Run("sudo", "zfs", "list", "-H", "-o", "used,avail,refer", fmt.Sprintf("%s/%s", poolName, zFilesystemClone.DatasetName))

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	// update ZFILESYSTEMS table
	zfsList := strings.Split(response.StdOut, "\t")

	fmt.Println(zfsList)

	query = fmt.Sprintf("UPDATE ZFILESYSTEMS SET Used = '%s', Available = '%s', Refer = '%s' WHERE Id = '%s'", zfsList[0], zfsList[1], zfsList[2], zFilesystemId)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	ZSnapshotLogMessage(LogPriority.Info, zSnapshotLogMessageId.ZSnapshotClone, logVariables)
	format.JSON(w, http.StatusOK, "Filesystem created")
}
