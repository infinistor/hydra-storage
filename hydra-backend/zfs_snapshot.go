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

	"github.com/go-chi/chi"
	"gopkg.in/pygz/subprocess.v1"
)

type ZSnapshot struct {
	Id           string  `json:"id" db:"Id"`
	Name         string  `json:"name" db:"Name"`
	DatasetRefId string  `json:"dataset_ref_id" db:"DatasetRefId"`
	Guid         *string `json:"guid,omitempty" db:"Guid"`
	Used         string  `json:"used" db:"Used"`
	Refer        string  `json:"refer" db:"Refer"`
	Comment      *string `json:"comment,omitempty" db:"Comment"`
	UpdateDate   string  `json:"update_date" db:"UpdateDate"`
}

type ZSnapshot_Post struct {
	Name    string  `json:"name"`
	Comment *string `json:"comment,omitempty"`
}

// @Summary Create snapshot
// @Description Create snapshot for dataset
// @Tags storage
// @Accept  json
// @Produce  json
// @Param id path string true "Dataset ID"
// @Param ZSnapshot_Post body ZSnapshot_Post true "Snapshot"
// @Success 200 {string} string	"Snapshot created successfully"
// @Failure 400 {object} Response	"Invalid request"
// @Failure 500 {object} Response	"Internal server error"
// @Router /api/storage/filesystems/{id}/snapshots [post]
func createSnapshot(w http.ResponseWriter, r *http.Request) {
	// get dataset id from url
	dataset_id := chi.URLParam(r, "id")
	// get ZSnapshot_Post from request body
	var zsnapshot_post ZSnapshot_Post
	_ = json.NewDecoder(r.Body).Decode(&zsnapshot_post)

	// get dataset name from db
	var dataset_name string
	query := fmt.Sprintf("SELECT Name FROM ZFILESYSTEMS WHERE Id = '%s'", dataset_id)
	err := conn.QueryRow(query).Scan(&dataset_name)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	pathway, err := getDatasetPath(dataset_id)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	pathway = pathway[1:]
	snapshotFull := pathway + "@" + zsnapshot_post.Name

	RequestLog := fmt.Sprintf("[%s] %s requested to create a snapshot of dataset '%s' in pool '%s'", LogProcessName, "admin", dataset_name, strings.Split(pathway, "/")[0])
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: snapshotFull,
	}

	// create snapshot
	// zfs snapshot pool1/dataset1@timestamp
	response := subprocess.Run("sudo", "zfs", "snapshot", snapshotFull)

	if response.ExitCode != 0 {
		ZSnapshotLogMessage(LogPriority.Error, zSnapshotLogMessageId.ZSnapshotCreateFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	// get used and refer from zfs list command
	// zfs list -H -o used,refer pool1/dataset1@timestamp
	response = subprocess.Run("sudo", "zfs", "list", "-H", "-o", "used,refer", snapshotFull)

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	var used, refer string
	_, err = fmt.Sscanf(response.StdOut, "%s\t%s", &used, &refer)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// insert snapshot into db
	query = fmt.Sprintf("INSERT INTO ZSNAPSHOTS (Name, DatasetRefId, Used, Refer) VALUES ('%s', '%s', '%s', '%s')", zsnapshot_post.Name, dataset_id, used, refer)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	if zsnapshot_post.Comment != nil {
		// update comment
		query = fmt.Sprintf("UPDATE ZSNAPSHOTS SET Comment = '%s' WHERE Name = '%s' AND DatasetRefId = '%s'", *zsnapshot_post.Comment, zsnapshot_post.Name, dataset_id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	// update guid
	response = subprocess.Run("sudo", "zfs", "get", "-H", "-o", "value", "guid", snapshotFull)

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	var guid string
	_, err = fmt.Sscanf(response.StdOut, "%s", &guid)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	query = fmt.Sprintf("UPDATE ZSNAPSHOTS SET Guid = '%s' WHERE Name = '%s' AND DatasetRefId = '%s'", guid, zsnapshot_post.Name, dataset_id)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	ZSnapshotLogMessage(LogPriority.Info, zSnapshotLogMessageId.ZSnapshotCreate, logVariables)
	format.JSON(w, http.StatusOK, "Snapshot created successfully")
}

type SnapshotList struct {
	ID         string         `json:"id"`
	UUID       string         `json:"uuid"`
	Open       bool           `json:"open"`
	Name       string         `json:"name" db:"Name"`
	Guid       *string        `json:"guid,omitempty" db:"Guid"`
	UpdateDate *string        `json:"update_date,omitempty" db:"UpdateDate"`
	Used       *string        `json:"used,omitempty" db:"Used"`
	Refer      *string        `json:"refer,omitempty" db:"Refer"`
	Comment    *string        `json:"comment,omitempty", db:"Comment"`
	Data       []SnapshotList `json:"data"`
}

// @Summary List snapshots
// @Description List snapshots for dataset
// @Tags storage
// @Accept  json
// @Produce  json
// @Success 200 {object} SnapshotList	"Snapshot list"
// @Failure 400 {object} Response	"Invalid request"
// @Failure 500 {object} Response	"Internal server error"
// @Router /api/storage/snapshots [get]
func listSnapshots(w http.ResponseWriter, r *http.Request) {
	// get all pools

	zpools := []ZPool{}
	query := "SELECT * FROM ZPOOLS"
	err := conn.Select(&zpools, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	snapshotList := []SnapshotList{}

	if len(zpools) == 0 {
		format.JSON(w, http.StatusOK, snapshotList)
		return
	}

	counterLevel1 := 1 // level 1 counter
	counterLevel2 := 1 // level 2 counter
	counterLevel3 := 1 // level 3 counter
	for _, zpool := range zpools {
		// get pool id and name
		var pool_id, pool_name string
		pool_id = zpool.Id
		pool_name = zpool.Name
		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		zfilesystems := []ZFileSystem{}
		// get all datasets where pool id is equal to pool id from url
		query := fmt.Sprintf("SELECT * FROM ZFILESYSTEMS WHERE PoolRefId = '%s'", pool_id)
		err = conn.Select(&zfilesystems, query)

		if err != nil {
			continue
		}

		// if there are no snapshots for dataset, continue
		if len(zfilesystems) == 0 {
			continue
		}

		snapshotList = append(snapshotList, SnapshotList{ID: fmt.Sprintf("%d", counterLevel1), UUID: pool_id, Open: true, Name: pool_name, Data: []SnapshotList{}})

		snapshotNo := 0

		for _, zfilesystem := range zfilesystems {
			// get dataset id and name
			var dataset_id, dataset_name string
			dataset_id = zfilesystem.Id
			dataset_name = zfilesystem.Name

			if err != nil {
				format.JSON(w, http.StatusInternalServerError, err.Error())
				return
			}

			// get all snapshots where dataset id is equal to dataset id from db if there are any
			var snapshots []ZSnapshot
			query := fmt.Sprintf("SELECT * FROM ZSNAPSHOTS WHERE DatasetRefId = '%s' ORDER BY UpdateDate ASC", dataset_id)
			err := conn.Select(&snapshots, query)

			if err != nil {
				continue
			}

			// if there are no snapshots for dataset, continue
			if len(snapshots) == 0 {
				continue
			}

			snapshotList[counterLevel1-1].Data = append(snapshotList[counterLevel1-1].Data, SnapshotList{ID: fmt.Sprintf("%d.%d", counterLevel1, counterLevel2), UUID: dataset_id, Open: true, Name: dataset_name, Data: []SnapshotList{}})

			for _, snapshot := range snapshots {
				used := snapshot.Used
				refer := snapshot.Refer
				updateDate := snapshot.UpdateDate // Create a new variable and assign the value

				// Create a new snapshot with the updated UpdateDate field
				updatedSnapshot := SnapshotList{
					ID:         fmt.Sprintf("%d.%d.%d", counterLevel1, counterLevel2, counterLevel3),
					UUID:       snapshot.Id,
					Open:       false,
					Name:       snapshot.Name,
					Guid:       snapshot.Guid,
					Used:       &used,
					Refer:      &refer,
					Comment:    snapshot.Comment,
					UpdateDate: &updateDate,
				}

				snapshotList[counterLevel1-1].Data[counterLevel2-1].Data = append(
					snapshotList[counterLevel1-1].Data[counterLevel2-1].Data,
					updatedSnapshot,
				)

				counterLevel3++
				snapshotNo++
			}

			counterLevel2++
			counterLevel3 = 1
		}

		if snapshotNo == 0 {
			// check if length snapshotList is one, if so, empty array
			if len(snapshotList) == 1 {
				snapshotList = []SnapshotList{}
				counterLevel1 = 1
				counterLevel2 = 1
				counterLevel3 = 1
			} else if len(snapshotList) > 1 {
				// delete pool from slice
				snapshotList = snapshotList[:len(snapshotList)-1]
				counterLevel1--
				counterLevel2 = 1
				counterLevel3 = 1
			}
			continue
		}

		counterLevel1++
		counterLevel2 = 1
	}

	format.JSON(w, http.StatusOK, snapshotList)
}

type Snapshot_Get struct {
	FullPath    string `json:"full_path"`
	GUID        string `json:"guid"`
	PoolRefId   string `json:"pool_ref_id"`
	PoolName    string `json:"pool_name"`
	Compression string `json:"compression"`
	RecordSize  string `json:"record_size"`
}

// @Summary Get snapshot by id
// @Description Get snapshot by id
// @Tags storage
// @Produce json
// @Param id path string true "Snapshot ID"
// @Success 200 {object} Snapshot_Get
// @Failure 400 {object} Response
// @Router /api/storage/snapshots/{id} [get]
func getSnapshotById(w http.ResponseWriter, r *http.Request) {
	snapshot_id := chi.URLParam(r, "id")

	// get snapshot by id
	var guid string
	query := fmt.Sprintf("SELECT Guid FROM ZSNAPSHOTS WHERE Id = '%s'", snapshot_id)
	err := conn.QueryRow(query).Scan(&guid)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	snapshot_full_path := ""
	err = snapshotFullPath(snapshot_id, &snapshot_full_path)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
	}

	// get poolrefid
	var poolrefid string
	query = fmt.Sprintf("SELECT PoolRefId FROM ZFILESYSTEMS WHERE Id = (SELECT DatasetRefId FROM ZSNAPSHOTS WHERE Id = '%s')", snapshot_id)
	err = conn.QueryRow(query).Scan(&poolrefid)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// get pool name
	var poolname string
	query = fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", poolrefid)
	err = conn.QueryRow(query).Scan(&poolname)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// get zfilesystem where id is equal to datasetrefid from zsnapshots
	var zfilesystem ZFileSystem
	query = fmt.Sprintf("SELECT * FROM ZFILESYSTEMS WHERE Id = (SELECT DatasetRefId FROM ZSNAPSHOTS WHERE Id = '%s')", snapshot_id)
	err = conn.Get(&zfilesystem, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	snapshotGet := Snapshot_Get{
		FullPath:    snapshot_full_path,
		GUID:        guid,
		PoolRefId:   poolrefid,
		PoolName:    poolname,
		Compression: zfilesystem.Compression,
		RecordSize:  zfilesystem.RecordSize,
	}

	format.JSON(w, http.StatusOK, snapshotGet)
}

type SnapshotNameCheck struct {
	PoolName     string `json:"pool_name"`
	DatasetName  string `json:"dataset_name"`
	SnapshotName string `json:"snapshot_name"`
}

// @Summary Check snapshot name
// @Description Check if snapshot name is available
// @Tags storage
// @Accept  json
// @Produce  json
// @Param snapshot_name body SnapshotNameCheck true "Snapshot name"
// @Success 200 {boolean} boolean	"Snapshot name is available"
// @Failure 400 {object} Response	"Invalid request"
// @Failure 500 {object} Response	"Internal server error"
// @Router /api/storage/snapshots/check [post]
func checkSnapshotName(w http.ResponseWriter, r *http.Request) {
	// decode request body
	var snapshotNameCheck SnapshotNameCheck
	err := json.NewDecoder(r.Body).Decode(&snapshotNameCheck)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	response := subprocess.Run("sudo", "zfs", "list", "-t", "snapshot", "-o", "name", "-H", fmt.Sprintf("%s/%s@%s", snapshotNameCheck.PoolName, snapshotNameCheck.DatasetName, snapshotNameCheck.SnapshotName))

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusOK, true)
		return
	}

	format.JSON(w, http.StatusOK, false)
}

func snapshotFullPath(snapshot_id string, snapshot_full_path *string) error {
	// get snapshot name from db
	var snapshot_name string
	query := fmt.Sprintf("SELECT Name FROM ZSNAPSHOTS WHERE Id = '%s'", snapshot_id)
	err := conn.QueryRow(query).Scan(&snapshot_name)

	if err != nil {
		return err
	}

	// get dataset id from db
	var dataset_id string
	query = fmt.Sprintf("SELECT DatasetRefId FROM ZSNAPSHOTS WHERE Id = '%s'", snapshot_id)
	err = conn.QueryRow(query).Scan(&dataset_id)

	if err != nil {
		return err
	}

	// get dataset name from db
	var dataset_name string
	query = fmt.Sprintf("SELECT Name FROM ZFILESYSTEMS WHERE Id = '%s'", dataset_id)
	err = conn.QueryRow(query).Scan(&dataset_name)

	if err != nil {
		return err
	}

	// get pool id from db
	var pool_id string
	query = fmt.Sprintf("SELECT PoolRefId FROM ZFILESYSTEMS WHERE Id = '%s'", dataset_id)
	err = conn.QueryRow(query).Scan(&pool_id)

	if err != nil {
		return err
	}

	// get pool name from db
	var pool_name string
	query = fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", pool_id)
	err = conn.QueryRow(query).Scan(&pool_name)

	if err != nil {
		return err
	}

	*snapshot_full_path = fmt.Sprintf("%s/%s@%s", pool_name, dataset_name, snapshot_name)
	return nil
}

// @Summary Delete snapshot
// @Description Delete snapshot
// @Tags storage
// @Accept  json
// @Produce  json
// @Param id path string true "Snapshot ID"
// @Success 200 {string} string	"Snapshot deleted successfully"
// @Failure 400 {object} Response	"Invalid request"
// @Failure 500 {object} Response	"Internal server error"
// @Router /api/storage/snapshots/{id} [delete]
func deleteSnapshot(w http.ResponseWriter, r *http.Request) {
	// get snapshot id from url
	snapshot_id := chi.URLParam(r, "id")

	// get snapshot full path
	snapshot_full_path := ""
	err := snapshotFullPath(snapshot_id, &snapshot_full_path)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to delete snapshot '%s'", LogProcessName, "admin", snapshot_full_path)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: snapshot_full_path,
	}

	// delete snapshot
	// zfs destroy pool1/dataset1@timestamp
	response := subprocess.Run("sudo", "zfs", "destroy", "-r", snapshot_full_path)

	if response.ExitCode != 0 {
		ZSnapshotLogMessage(LogPriority.Error, zSnapshotLogMessageId.ZSnapshotDestroyFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	// delete snapshot from db
	query := fmt.Sprintf("DELETE FROM ZSNAPSHOTS WHERE Id = '%s'", snapshot_id)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	ZSnapshotLogMessage(LogPriority.Info, zSnapshotLogMessageId.ZSnapshotDestroy, logVariables)
	format.JSON(w, http.StatusOK, "Snapshot deleted successfully")
}

// @Summary Rollback to snapshot
// @Description Rollback to snapshot
// @Tags storage
// @Accept  json
// @Produce  json
// @Param id path string true "Snapshot ID"
// @Success 200 {string} string	"Snapshot rolled back successfully"
// @Failure 400 {object} Response	"Invalid request"
// @Failure 500 {object} Response	"Internal server error"
// @Router /api/storage/snapshots/{id}/rollback [post]
func rollbackToSnapshot(w http.ResponseWriter, r *http.Request) {
	// get snapshot id from url
	snapshot_id := chi.URLParam(r, "id")

	// get dataset id from db
	var dataset_id string
	query := fmt.Sprintf("SELECT DatasetRefId FROM ZSNAPSHOTS WHERE Id = '%s'", snapshot_id)
	err := conn.QueryRow(query).Scan(&dataset_id)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// get dataset name from db
	var dataset_name string
	query = fmt.Sprintf("SELECT Name FROM ZFILESYSTEMS WHERE Id = '%s'", dataset_id)
	err = conn.QueryRow(query).Scan(&dataset_name)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// get pool name from db
	var pool_name string
	query = fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = (SELECT PoolRefId FROM ZFILESYSTEMS WHERE Id = '%s')", dataset_id)
	err = conn.QueryRow(query).Scan(&pool_name)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// get snapshot name from db
	var snapshot_name string
	query = fmt.Sprintf("SELECT Name FROM ZSNAPSHOTS WHERE Id = '%s'", snapshot_id)
	err = conn.QueryRow(query).Scan(&snapshot_name)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to rollback dataset '%s' in pool '%s' to snapshot '%s'", LogProcessName, "admin", dataset_name, pool_name, snapshot_name)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName:   snapshot_name,
		TargetValues: []string{dataset_name, pool_name},
	}

	// rollback to snapshot
	// zfs rollback pool1/dataset1@timestamp
	response := subprocess.Run("sudo", "zfs", "rollback", "-r", pool_name+"/"+dataset_name+"@"+snapshot_name)

	if response.ExitCode != 0 {
		ZSnapshotLogMessage(LogPriority.Error, zSnapshotLogMessageId.ZSnapshotRollbackFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	// delete snapshots after the selected snapshot from db
	query = fmt.Sprintf("DELETE FROM ZSNAPSHOTS WHERE DatasetRefId = '%s' AND UpdateDate > (SELECT UpdateDate FROM ZSNAPSHOTS WHERE Id = '%s')", dataset_id, snapshot_id)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	ZSnapshotLogMessage(LogPriority.Info, zSnapshotLogMessageId.ZSnapshotRollback, logVariables)
	format.JSON(w, http.StatusOK, "Snapshot rolled back successfully")
}
