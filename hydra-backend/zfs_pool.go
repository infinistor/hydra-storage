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
	"math"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi"
	"github.com/google/uuid"
	"gopkg.in/pygz/subprocess.v1"
)

type Disk struct {
	Name string `json:"name"`
	Size string `json:"size"`
}

// @Summary List Available Disks
// @Description List Available Disks
// @Tags storage
// @Accept  json
// @Produce  json
// @Success 200 {array} Disk
// @Failure 500 {object} Response
// @Router /api/storage/pools/disks [get]
func listAvailableDisks(w http.ResponseWriter, r *http.Request) {
	response := subprocess.Run("lsblk")

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	disks := []Disk{}
	lines := strings.Split(strings.TrimSpace(response.StdOut), "\n")[1:]

	// Regular expression pattern to match disk lines
	diskPattern := regexp.MustCompile(`^(\w+)\s+\d+:\d+\s+\d+\s+([\d.]+[A-Z])\s+\d+\s+\w+\s*`)
	skipNextLine := false

	for i, line := range lines {
		if skipNextLine {
			skipNextLine = false
			continue
		}

		// check if the line contains a disk, if not skip it (e.g. rom disks)
		if !strings.Contains(line, "disk") {
			continue
		}

		match := diskPattern.FindStringSubmatch(line)
		if match != nil {
			diskName := match[1]
			diskSize := match[2]

			// Check if the next line exists and is a partition line
			if i+1 < len(lines) {
				nextLine := lines[i+1]
				if strings.HasPrefix(nextLine, "├─") || strings.HasPrefix(nextLine, "└─") {
					// Skip this disk if the next line indicates a partition
					skipNextLine = true
					continue
				}
			}

			disks = append(disks, Disk{Name: diskName, Size: diskSize})
		}
	}

	format.JSON(w, http.StatusOK, disks)
}

func (ZPool) TableName() string { return "ZPOOLS" }

type ZPool struct {
	Id            string `json:"id" db:"Id"`
	Name          string `json:"name" db:"Name"`
	Configuration string `json:"configuration" db:"Configuration"`
	Size          string `json:"size" db:"Size"`
	Alloc         string `json:"alloc" db:"Alloc"`
	Free          string `json:"free" db:"Free"`
	Used          string `json:"used" db:"Used"`
	Available     string `json:"available" db:"Available"`
	Refer         string `json:"refer" db:"Refer"`
	Ckpoint       string `json:"ckpoint" db:"Ckpoint"`
	Expandsz      string `json:"expandsz" db:"Expandsz"`
	Frag          string `json:"frag" db:"Frag"`
	Cap           string `json:"cap" db:"Cap"`
	DedupRatio    string `json:"dedupratio" db:"DedupRatio"`
	Health        string `json:"health" db:"Health"`
	Altroot       string `json:"altroot" db:"Altroot"`
	Dedup         string `json:"dedup" db:"Dedup"`
	Compression   string `json:"compression" db:"Compression"`
}

type ZPool_Get struct {
	Id                         string `json:"id" db:"Id"`
	Name                       string `json:"name" db:"Name"`
	Configuration              string `json:"configuration" db:"Configuration"`
	Size                       string `json:"size" db:"Size"`
	Alloc                      string `json:"alloc" db:"Alloc"`
	Free                       string `json:"free" db:"Free"`
	Used                       string `json:"used" db:"Used"`
	Available                  string `json:"available" db:"Available"`
	Refer                      string `json:"refer" db:"Refer"`
	Ckpoint                    string `json:"ckpoint" db:"Ckpoint"`
	Expandsz                   string `json:"expandsz" db:"Expandsz"`
	Frag                       string `json:"frag" db:"Frag"`
	Cap                        string `json:"cap" db:"Cap"`
	DedupRatio                 string `json:"dedupratio" db:"DedupRatio"`
	Health                     string `json:"health" db:"Health"`
	Altroot                    string `json:"altroot" db:"Altroot"`
	Dedup                      string `json:"dedup" db:"Dedup"`
	Compression                string `json:"compression" db:"Compression"`
	AvailableAndAllocatedRatio int    `json:"available_and_allocated_ratio"`
}

func calculateRatio(allocated string, size string) int {
	var sizeFloat float64
	var allocatedFloat float64

	if allocated == "Unknown" || size == "Unknown" {
		return 1
	}

	reg := regexp.MustCompile("[a-zA-Z]")

	// remove all letters from the string
	sizeString := reg.ReplaceAllString(size, "")
	sizeFloat, _ = strconv.ParseFloat(sizeString, 64)
	if size[len(size)-1] == 'M' {
		sizeFloat = sizeFloat * 1000
	} else if size[len(size)-1] == 'G' {
		sizeFloat = sizeFloat * 1000 * 1000
	} else if size[len(size)-1] == 'T' {
		sizeFloat = sizeFloat * 1000 * 1000 * 1000
	}

	allocatedString := reg.ReplaceAllString(allocated, "")
	allocatedFloat, _ = strconv.ParseFloat(allocatedString, 64)
	if allocated[len(allocated)-1] == 'M' {
		allocatedFloat = allocatedFloat * 1000
	} else if allocated[len(allocated)-1] == 'G' {
		allocatedFloat = allocatedFloat * 1000 * 1000
	} else if allocated[len(allocated)-1] == 'T' {
		allocatedFloat = allocatedFloat * 1000 * 1000 * 1000
	}

	// how much of the pool is allocated
	ratio := (allocatedFloat / sizeFloat) * 100
	ratio = math.Round(ratio*100) / 100
	// cast to int
	ratioInt := int(ratio)
	if ratioInt == 0 {
		ratioInt = 1
	} else if ratioInt >= 100 {
		ratioInt = 99
	}

	return ratioInt
}

// @Summary List Pools
// @Description List Pools
// @Tags storage
// @Accept  json
// @Produce  json
// @Success 200 {array} ZPool_Get
// @Failure 500 {object} Response
// @Router /api/storage/pools [get]
func listPools(w http.ResponseWriter, r *http.Request) {
	// select Id, Name from ZPOOLS
	pools := []ZPool{}

	err := conn.Select(&pools, "SELECT * FROM ZPOOLS")

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// for each pool, check if its values have changed
	for _, pool := range pools {
		// update the ZPOOLS table with the pool id
		// set Size etc.
		// zpool list -H -o size,alloc,free,cap,ckpoint,expandsz,frag,cap,dedup,health,altroot pool1
		// zfs list -H -o used,avail,refer pool1
		response := subprocess.Run("sudo", "zpool", "list", "-H", "-o", "size,alloc,free,cap,ckpoint,expandsz,frag,dedup,health,altroot", pool.Name)

		if response.ExitCode != 0 {
			// check if pool has been exported
			exported := checkIfPoolIsExported(pool.Name)
			if exported {
				// set health to "exported"
				// set everything else to "Unknown"
				query := fmt.Sprintf("UPDATE ZPOOLS SET Size = '%s', Alloc = '%s', Free = '%s', Cap = '%s', Ckpoint = '%s', Expandsz = '%s', Frag = '%s', DedupRatio = '%s', Health = '%s', Altroot = '%s', Used = '%s', Available = '%s', Refer = '%s' WHERE Id = '%s'", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "EXPORTED", "Unknown", "Unknown", "Unknown", "Unknown", pool.Id)
				conn.Exec(query)
				continue
			} else {
				// set health to missing
				// set everything else to "Unknown"
				query := fmt.Sprintf("UPDATE ZPOOLS SET Size = '%s', Alloc = '%s', Free = '%s', Cap = '%s', Ckpoint = '%s', Expandsz = '%s', Frag = '%s', DedupRatio = '%s', Health = '%s', Altroot = '%s', Used = '%s', Available = '%s', Refer = '%s' WHERE Id = '%s'", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "MISSING", "Unknown", "Unknown", "Unknown", "Unknown", pool.Id)
				conn.Exec(query)
				continue
			}
		}
		// get current helth of the pool
		query := fmt.Sprintf("SELECT Health FROM ZPOOLS WHERE Id = '%s'", pool.Id)
		var health string
		conn.Get(&health, query)

		// split by tab, remove the last element (empty string)
		zpoolList := strings.Split(strings.TrimSpace(response.StdOut), "\t")

		// if current state is "Removing", do not update the database
		if health == "REMOVING" {
			zpoolList[8] = "REMOVING"
		}

		query = fmt.Sprintf("UPDATE ZPOOLS SET Size = '%s', Alloc = '%s', Free = '%s', Cap = '%s', Ckpoint = '%s', Expandsz = '%s', Frag = '%s', DedupRatio = '%s', Health = '%s', Altroot = '%s' WHERE Id = '%s'", zpoolList[0], zpoolList[1], zpoolList[2], zpoolList[3], zpoolList[4], zpoolList[5], zpoolList[6], zpoolList[7], zpoolList[8], zpoolList[9], pool.Id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		response = subprocess.Run("sudo", "zfs", "list", "-H", "-o", "used,avail,refer", pool.Name)

		if response.ExitCode != 0 {
			query := fmt.Sprintf("UPDATE ZPOOLS SET Size = '%s', Alloc = '%s', Free = '%s', Cap = '%s', Ckpoint = '%s', Expandsz = '%s', Frag = '%s', DedupRatio = '%s', Health = '%s', Altroot = '%s', Used = '%s', Available = '%s', Refer = '%s' WHERE Id = '%s'", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "MISSING", "Unknown", "Unknown", "Unknown", "Unknown", pool.Id)
			conn.Exec(query)
			continue
		}

		zfsList := strings.Split(strings.TrimSpace(response.StdOut), "\t")

		query = fmt.Sprintf("UPDATE ZPOOLS SET Used = '%s', Available = '%s', Refer = '%s' WHERE Id = '%s'", zfsList[0], zfsList[1], zfsList[2], pool.Id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	// select * from ZPOOLS
	err = conn.Select(&pools, "SELECT * FROM ZPOOLS ORDER BY Name ASC")

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	zpools := []ZPool_Get{}

	for _, pool := range pools {
		// available and size can end in "K", "M", "G", "T"
		// convert to bytes

		ratioInt := calculateRatio(pool.Alloc, pool.Size)

		zpools = append(zpools, ZPool_Get{
			Id:                         pool.Id,
			Name:                       pool.Name,
			Configuration:              pool.Configuration,
			Size:                       pool.Size,
			Alloc:                      pool.Alloc,
			Free:                       pool.Free,
			Used:                       pool.Used,
			Available:                  pool.Available,
			Refer:                      pool.Refer,
			Ckpoint:                    pool.Ckpoint,
			Expandsz:                   pool.Expandsz,
			Frag:                       pool.Frag,
			Cap:                        pool.Cap,
			DedupRatio:                 pool.DedupRatio,
			Health:                     pool.Health,
			Altroot:                    pool.Altroot,
			Dedup:                      pool.Dedup,
			Compression:                pool.Compression,
			AvailableAndAllocatedRatio: ratioInt,
		})
	}

	format.JSON(w, http.StatusOK, zpools)
}

// @Summary List Disks In Pool
// @Description List Disks In Pool
// @Tags storage
// @Accept  json
// @Produce  json
// @Param id path string true "Pool Id"
// @Success 200 {array} string
// @Failure 500 {object} Response
// @Router /api/storage/pools/{id}/disks [get]
func listDisksInPool(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// select Disk from PARTITIONS where PoolRefId = id
	disks := []string{}

	query := fmt.Sprintf("SELECT Disk FROM PARTITIONS WHERE PoolRefId = '%s' ORDER BY Disk ASC", id)
	err := conn.Select(&disks, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, disks)
}

// @Summary Get Pool By Id
// @Description Get Pool By Id
// @Tags storage
// @Accept  json
// @Produce  json
// @Param id path string true "Pool Id"
// @Success 200 {object} ZPool_Get
// @Failure 500 {object} Response
// @Router /api/storage/pools/{id} [get]
func getPoolById(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	pool := ZPool{}

	// select * from ZPOOLS where Id = id
	query := fmt.Sprintf("SELECT * FROM ZPOOLS WHERE Id = '%s'", id)
	err := conn.Get(&pool, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	response := subprocess.Run("sudo", "zpool", "list", "-H", "-o", "size,alloc,free,cap,ckpoint,expandsz,frag,dedup,health,altroot", pool.Name)

	if response.ExitCode != 0 {
		// check if pool has been exported
		exported := checkIfPoolIsExported(pool.Name)
		if exported {
			// set health to "exported"
			// set everything else to "Unknown"
			query := fmt.Sprintf("UPDATE ZPOOLS SET Size = '%s', Alloc = '%s', Free = '%s', Cap = '%s', Ckpoint = '%s', Expandsz = '%s', Frag = '%s', DedupRatio = '%s', Health = '%s', Altroot = '%s', Used = '%s', Available = '%s', Refer = '%s' WHERE Id = '%s'", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "EXPORTED", "Unknown", "Unknown", "Unknown", "Unknown", pool.Id)
			conn.Exec(query)
		} else {
			// set health to missing
			// set everything else to "Unknown"
			query := fmt.Sprintf("UPDATE ZPOOLS SET Size = '%s', Alloc = '%s', Free = '%s', Cap = '%s', Ckpoint = '%s', Expandsz = '%s', Frag = '%s', DedupRatio = '%s', Health = '%s', Altroot = '%s', Used = '%s', Available = '%s', Refer = '%s' WHERE Id = '%s'", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "Unknown", "MISSING", "Unknown", "Unknown", "Unknown", "Unknown", pool.Id)
			conn.Exec(query)
		}
	} else {
		// get current helth of the pool
		query := fmt.Sprintf("SELECT Health FROM ZPOOLS WHERE Id = '%s'", pool.Id)
		var health string
		conn.Get(&health, query)

		// split by tab, remove the last element (empty string)
		zpoolList := strings.Split(strings.TrimSpace(response.StdOut), "\t")

		// if current state is "Removing", do not update the database
		if health == "REMOVING" {
			zpoolList[8] = "REMOVING"
		}

		query = fmt.Sprintf("UPDATE ZPOOLS SET Size = '%s', Alloc = '%s', Free = '%s', Cap = '%s', Ckpoint = '%s', Expandsz = '%s', Frag = '%s', DedupRatio = '%s', Health = '%s', Altroot = '%s' WHERE Id = '%s'", zpoolList[0], zpoolList[1], zpoolList[2], zpoolList[3], zpoolList[4], zpoolList[5], zpoolList[6], zpoolList[7], zpoolList[8], zpoolList[9], pool.Id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		response = subprocess.Run("sudo", "zfs", "list", "-H", "-o", "used,avail,refer", pool.Name)

		if response.ExitCode != 0 {
			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}

		zfsList := strings.Split(strings.TrimSpace(response.StdOut), "\t")

		query = fmt.Sprintf("UPDATE ZPOOLS SET Used = '%s', Available = '%s', Refer = '%s' WHERE Id = '%s'", zfsList[0], zfsList[1], zfsList[2], pool.Id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	err = conn.Get(&pool, "SELECT * FROM ZPOOLS WHERE Id = ?", id)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	var zpool ZPool_Get

	ratioInt := calculateRatio(pool.Alloc, pool.Size)

	zpool = ZPool_Get{
		Id:                         pool.Id,
		Name:                       pool.Name,
		Configuration:              pool.Configuration,
		Size:                       pool.Size,
		Alloc:                      pool.Alloc,
		Free:                       pool.Free,
		Used:                       pool.Used,
		Available:                  pool.Available,
		Refer:                      pool.Refer,
		Ckpoint:                    pool.Ckpoint,
		Expandsz:                   pool.Expandsz,
		Frag:                       pool.Frag,
		Cap:                        pool.Cap,
		DedupRatio:                 pool.DedupRatio,
		Health:                     pool.Health,
		Altroot:                    pool.Altroot,
		Dedup:                      pool.Dedup,
		Compression:                pool.Compression,
		AvailableAndAllocatedRatio: ratioInt,
	}

	format.JSON(w, http.StatusOK, zpool)
}

type DiskGroup struct {
	Configuration string   `json:"configuration"`
	Disks         []string `json:"disks"`
}

type ZPool_Post struct {
	Name          string      `json:"name"`
	Configuration string      `json:"configuration"`
	DiskGroups    []DiskGroup `json:"disk_groups"`
	LogDisks      *[]string   `json:"log_disks,omitempty"`
	CacheDisks    *[]string   `json:"cache_disks,omitempty"`
	SpareDisks    *[]string   `json:"spare_disks,omitempty"`
	Dedup         string      `json:"dedup"`
	Compression   string      `json:"compression"`
}

func createPartition(disk string) error {
	response := subprocess.Run("sudo", "parted", "-s", "/dev/"+disk, "mklabel", "gpt", "mkpart", "primary", "0%", "100%")

	if response.ExitCode != 0 {
		return errors.New(response.StdErr)
	} else {
		// wait for partition to be created
		waitTillPartitionIsCreated(disk)
		return nil
	}
}

func waitTillPartitionIsCreated(disk string) {
	// check if partition is created
	// if not --> wait for 1 millisecond and check again
	// if yes --> return
	for {
		response := subprocess.Run("sudo", "lsblk", "-n", "-o", "PARTUUID", "-r", "/dev/"+disk)

		// remove all empty lines
		lines := strings.TrimSpace(response.StdOut)

		// if there are fewer than 2 lines, it means that the partition is not created yet
		if len(lines) < 2 {
			time.Sleep(time.Millisecond)
		} else {
			break
		}
	}
}

func savePartitionToDatabase(disk string, configuration string, partUuidList *[]string, pool_id *string) error {
	response := subprocess.Run("sudo", "lsblk", "-n", "-o", "PARTUUID", "-r", "/dev/"+disk)

	if response.ExitCode != 0 {
		return errors.New(response.StdErr)
	}

	lines := strings.Split(response.StdOut, "\n")
	partuuid := strings.TrimSpace(lines[1])
	*partUuidList = append(*partUuidList, partuuid)

	// get disk size
	response = subprocess.Run("sudo", "lsblk", "-n", "-o", "SIZE", "-r", "/dev/"+disk)

	if response.ExitCode != 0 {
		return errors.New(response.StdErr)
	}

	// divide reponse into lines
	lines = strings.Split(response.StdOut, "\n")
	size := strings.TrimSpace(lines[0])

	if pool_id != nil {
		// insert a new row in the PARTITIONS table
		query := fmt.Sprintf("INSERT INTO PARTITIONS (PartUuid, Disk, DiskSize, Configuration, PoolRefId) VALUES ('%s', '%s', '%s', '%s', '%s')", partuuid, disk, size, configuration, *pool_id)
		_, err := conn.Exec(query)

		if err != nil {
			return err
		}
	} else {
		// insert a new row in the PARTITIONS table
		query := fmt.Sprintf("INSERT INTO PARTITIONS (PartUuid, Disk, DiskSize, Configuration) VALUES ('%s', '%s', '%s', '%s')", partuuid, disk, size, configuration)
		_, err := conn.Exec(query)

		if err != nil {
			return err
		}
	}

	return nil
}

// @Summary Create Pool
// @Description Create Pool
// @Tags storage
// @Accept  json
// @Produce  json
// @Param pool body ZPool_Post true "Pool"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/storage/pools [post]
func createPool(w http.ResponseWriter, r *http.Request) {
	var pool ZPool_Post
	_ = json.NewDecoder(r.Body).Decode(&pool)

	RequestLog := fmt.Sprintf("[%s] %s requested to create a new pool '%s'", LogProcessName, "admin", pool.Name)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: pool.Name,
	}

	// create partition for each disk
	for _, diskGroup := range pool.DiskGroups {
		for _, disk := range diskGroup.Disks {
			response := createPartition(disk)

			if response != nil {
				ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)

				format.JSON(w, http.StatusInternalServerError, response.Error())
				return
			}
		}
	}

	// create partition for each log disk
	if pool.LogDisks != nil {
		for _, disk := range *pool.LogDisks {
			response := createPartition(disk)

			if response != nil {
				ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)

				format.JSON(w, http.StatusInternalServerError, response.Error())
				return
			}
		}
	}

	if pool.CacheDisks != nil {
		// create partition for each cache disk
		for _, disk := range *pool.CacheDisks {
			fmt.Println(disk)
			response := createPartition(disk)

			if response != nil {
				ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)

				format.JSON(w, http.StatusInternalServerError, response.Error())
				return
			}
		}
	}

	if pool.SpareDisks != nil {
		// create partition for each spare disk
		for _, disk := range *pool.SpareDisks {
			response := createPartition(disk)

			if response != nil {
				ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)

				format.JSON(w, http.StatusInternalServerError, response.Error())
				return
			}
		}
	}

	// find partuuid of each disk
	var partuuids []string
	for _, diskGroup := range pool.DiskGroups {
		for _, disk := range diskGroup.Disks {
			err := savePartitionToDatabase(disk, pool.Configuration, &partuuids, nil)

			if err != nil {
				deletePartitions(partuuids)

				ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)
				return
			}
		}
	}

	// find partuuid of each log disk
	var logPartuuids []string
	if pool.LogDisks != nil {
		for _, disk := range *pool.LogDisks {
			err := savePartitionToDatabase(disk, "log", &logPartuuids, nil)

			if err != nil {
				deletePartitions(partuuids)
				deletePartitions(logPartuuids)

				ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)
				return
			}
		}
	}

	// find partuuid of each cache disk
	var cachePartuuids []string
	if pool.CacheDisks != nil {
		for _, disk := range *pool.CacheDisks {
			err := savePartitionToDatabase(disk, "cache", &cachePartuuids, nil)

			if err != nil {
				deletePartitions(partuuids)
				deletePartitions(logPartuuids)
				deletePartitions(cachePartuuids)

				ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)
				return
			}
		}
	}

	// find partuuid of each spare disk
	var sparePartuuids []string
	if pool.SpareDisks != nil {
		for _, disk := range *pool.SpareDisks {
			err := savePartitionToDatabase(disk, "spare", &sparePartuuids, nil)

			if err != nil {
				deletePartitions(partuuids)
				deletePartitions(logPartuuids)
				deletePartitions(cachePartuuids)
				deletePartitions(sparePartuuids)

				ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)
				return
			}
		}
	}

	// create zpool with all partuuids
	command := "sudo zpool create -f " + pool.Name + " "
	for i, diskGroup := range pool.DiskGroups {
		if diskGroup.Configuration != "" {
			command += diskGroup.Configuration + " "
		}
		for j, _ := range diskGroup.Disks {
			command += partuuids[i*len(diskGroup.Disks)+j] + " "
		}
	}

	if len(logPartuuids) > 1 {
		command += "log "
		for _, partuuid := range logPartuuids {
			command += partuuid + " "
		}
	} else if len(logPartuuids) == 1 {
		command += "log " + logPartuuids[0] + " "
	}

	if len(cachePartuuids) > 1 {
		command += "cache "
		for _, partuuid := range cachePartuuids {
			command += partuuid + " "
		}
	} else if len(cachePartuuids) == 1 {
		command += "cache " + cachePartuuids[0] + " "
	}

	if len(sparePartuuids) > 1 {
		command += "spare "
		for _, partuuid := range sparePartuuids {
			command += partuuid + " "
		}
	} else if len(sparePartuuids) == 1 {
		command += "spare " + sparePartuuids[0] + " "
	}

	response := subprocess.Run("sh", "-c", command)

	if response.ExitCode != 0 {
		deletePartitions(partuuids)
		deletePartitions(logPartuuids)
		deletePartitions(cachePartuuids)
		deletePartitions(sparePartuuids)

		ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	if pool.Dedup != "off" {
		response := subprocess.Run("sudo", "zfs", "set", "dedup=on", pool.Name)

		if response.ExitCode != 0 {
			deletePartitions(partuuids)
			deletePartitions(logPartuuids)
			deletePartitions(cachePartuuids)
			deletePartitions(sparePartuuids)

			ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
	}

	if pool.Compression != "off" {
		response := subprocess.Run("sudo", "zfs", "set", "compression="+pool.Compression, pool.Name)

		if response.ExitCode != 0 {
			deletePartitions(partuuids)
			deletePartitions(logPartuuids)
			deletePartitions(cachePartuuids)
			deletePartitions(sparePartuuids)

			ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
	}

	// insert a new row in the ZPOOLS table
	query := fmt.Sprintf("INSERT INTO ZPOOLS (Name, Configuration, Dedup, Compression) VALUES ('%s', '%s', '%s', '%s')", pool.Name, pool.Configuration, pool.Dedup, pool.Compression)
	_, err := conn.Exec(query)

	if err != nil {
		// delete the zpool
		subprocess.Run("sudo", "zpool", "destroy", pool.Name)

		deletePartitions(partuuids)
		deletePartitions(logPartuuids)
		deletePartitions(cachePartuuids)
		deletePartitions(sparePartuuids)

		ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// select the id of the new row
	var id string
	query = fmt.Sprintf("SELECT Id FROM ZPOOLS WHERE Name = '%s'", pool.Name)
	err = conn.QueryRow(query).Scan(&id)

	if err != nil {
		// delete the zpool
		subprocess.Run("sudo", "zpool", "destroy", pool.Name)

		deletePartitions(partuuids)
		deletePartitions(logPartuuids)
		deletePartitions(cachePartuuids)
		deletePartitions(sparePartuuids)

		ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// update the ZPOOLS table with the pool id
	// set Size etc.
	// zpool list -H -o size,alloc,free,cap,ckpoint,expandsz,frag,cap,dedup,health,altroot pool1
	// zfs list -H -o used,avail,refer pool1
	response = subprocess.Run("sudo", "zpool", "list", "-H", "-o", "size,alloc,free,cap,ckpoint,expandsz,frag,dedup,health,altroot", pool.Name)

	if response.ExitCode != 0 {
		// delete the zpool from the ZPOOLS table
		query = fmt.Sprintf("DELETE FROM ZPOOLS WHERE Id = '%s'", id)

		// delete the zpool
		subprocess.Run("sudo", "zpool", "destroy", pool.Name)

		deletePartitions(partuuids)
		deletePartitions(logPartuuids)
		deletePartitions(cachePartuuids)
		deletePartitions(sparePartuuids)

		ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	zpoolList := strings.Split(response.StdOut, "\t")
	fmt.Sprintln(zpoolList)

	query = fmt.Sprintf("UPDATE ZPOOLS SET Size = '%s', Alloc = '%s', Free = '%s', Cap = '%s', Ckpoint = '%s', Expandsz = '%s', Frag = '%s', DedupRatio = '%s', Health = '%s', Altroot = '%s' WHERE Id = '%s'", zpoolList[0], zpoolList[1], zpoolList[2], zpoolList[3], zpoolList[4], zpoolList[5], zpoolList[6], zpoolList[7], zpoolList[8], zpoolList[9], id)
	_, err = conn.Exec(query)

	if err != nil {
		// delete the zpool from the ZPOOLS table
		query = fmt.Sprintf("DELETE FROM ZPOOLS WHERE Id = '%s'", id)

		// delete the zpool
		subprocess.Run("sudo", "zpool", "destroy", pool.Name)

		deletePartitions(partuuids)
		deletePartitions(logPartuuids)
		deletePartitions(cachePartuuids)
		deletePartitions(sparePartuuids)

		ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	response = subprocess.Run("sudo", "zfs", "list", "-H", "-o", "used,avail,refer", pool.Name)

	if response.ExitCode != 0 {
		// delete the zpool
		subprocess.Run("sudo", "zpool", "destroy", pool.Name)

		deletePartitions(partuuids)
		deletePartitions(logPartuuids)
		deletePartitions(cachePartuuids)
		deletePartitions(sparePartuuids)

		ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	zfsList := strings.Split(response.StdOut, "\t")

	query = fmt.Sprintf("UPDATE ZPOOLS SET Used = '%s', Available = '%s', Refer = '%s' WHERE Id = '%s'", zfsList[0], zfsList[1], zfsList[2], id)
	_, err = conn.Exec(query)

	if err != nil {
		// delete the zpool
		subprocess.Run("sudo", "zpool", "destroy", pool.Name)

		deletePartitions(partuuids)
		deletePartitions(logPartuuids)
		deletePartitions(cachePartuuids)
		deletePartitions(sparePartuuids)

		ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolCreateFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// join all partuuids (including log, cache and spare) into a comma separated string
	partuuidString := "'" + strings.Join(partuuids, "', '") + "'"
	if len(logPartuuids) > 0 {
		partuuidString += ", " + "'" + strings.Join(logPartuuids, "', '") + "'"
	}
	if len(cachePartuuids) > 0 {
		partuuidString += ", " + "'" + strings.Join(cachePartuuids, "', '") + "'"
	}
	if len(sparePartuuids) > 0 {
		partuuidString += ", " + "'" + strings.Join(sparePartuuids, "', '") + "'"
	}

	// update the PARTITIONS table with the PoolRefId
	query = fmt.Sprintf("UPDATE PARTITIONS SET PoolRefId = '%s' WHERE PartUuid IN (%s)", id, partuuidString)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
	}

	ZPoolLogMessage(LogPriority.Info, zPoolLogMessageId.ZPoolCreate, logVariables)

	format.JSON(w, http.StatusOK, "Pool created")
}

type ZPool_Modify struct {
	Compression string `json:"compression"`
}

// @Summary Modify a pool
// @Description Modify a pool
// @Tags storage
// @Accept  json
// @Produce  json
// @Param id path string true "Pool ID"
// @Param pool body ZPool_Modify true "Pool"
// @Success 200 {string} string "Pool modified"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/storage/pools/{id} [put]
func updatePool(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var pool ZPool_Modify
	err := json.NewDecoder(r.Body).Decode(&pool)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// select pool name from ZPOOLS table
	var pool_name string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", id)
	err = conn.QueryRow(query).Scan(&pool_name)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	response := subprocess.Run("sudo", "zfs", "set", "compression="+pool.Compression, pool_name)

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	// update the ZPOOLS table
	query = fmt.Sprintf("UPDATE ZPOOLS SET Compression = '%s' WHERE Id = '%s'", pool.Compression, id)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// ZPoolLogMessage(LogPriority.Info, zPoolLogMessageId.ZPoolModify, )
	format.JSON(w, http.StatusOK, "Pool modified")
}

func deletePartitions(partuuids []string) error {
	if len(partuuids) == 0 {
		return nil
	}

	for _, partuuid := range partuuids {
		removePartition(partuuid)
	}

	partUuidString := ""

	if len(partuuids) > 1 {
		partUuidString = strings.Join(partuuids, "', '")
	} else {
		partUuidString = partuuids[0]
	}

	// delete all partitions from the PARTITIONS table
	query := fmt.Sprintf("DELETE FROM PARTITIONS WHERE PartUuid IN ('%s')", partUuidString)
	_, err := conn.Exec(query)

	if err != nil {
		return err
	}

	return nil
}

func removePartition(partuuid string) error {
	var disk string
	query := fmt.Sprintf("SELECT Disk FROM PARTITIONS WHERE PartUuid = '%s'", partuuid)
	err := conn.QueryRow(query).Scan(&disk)

	if err != nil {
		return err
	}
	// Delete the partition
	// wipefs -a /dev/sdy
	response := subprocess.Run("sudo", "wipefs", "-a", "/dev/"+disk)

	if response.ExitCode != 0 {
		return errors.New(response.StdErr)
	}

	return nil
}

// @Summary Delete Pool
// @Description Delete Pool
// @Tags storage
// @Accept  json
// @Produce  json
// @Param id path string true "Pool ID"
// @Success 200 {object} Response
// @Failure 500 {object} Response
// @Router /api/storage/pools/{id} [delete]
func deletePool(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// select Name from ZPOOLS table
	var pool_name string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", id)
	err := conn.QueryRow(query).Scan(&pool_name)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to destroy pool '%s'", LogProcessName, "admin", pool_name)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: pool_name,
	}

	// get ids of all zfilesystems in the pool
	var zfilesystems []string
	query = fmt.Sprintf("SELECT Id FROM ZFILESYSTEMS WHERE PoolRefId = '%s'", id)
	rows, err := conn.Query(query)

	if err == nil {
		defer rows.Close()

		for rows.Next() {
			var zfilesystem string
			err := rows.Scan(&zfilesystem)

			if err != nil {
				continue
			}

			zfilesystems = append(zfilesystems, zfilesystem)
		}

		// for each zfilesystem, check if there is a service running on it and delete it
		for _, zfilesystem := range zfilesystems {
			deleteSMBShareByDatasetRefId(zfilesystem)
			deleteNFSExportByDatasetRefId(zfilesystem)
			deleteS3ConfigByDatasetRefId(zfilesystem)
		}
	}

	cron_id := uuid.New().String()
	// insert new cron job
	query = fmt.Sprintf("INSERT INTO CRONJOB (Id, Operation, PoolRefId, RepeatType, EverySecond) VALUES ('%s', 'JOB-REMOVE-POOL', '%s', 'SECOND', 5)", cron_id, id)
	conn.Exec(query)
	// check on scrub processes every 5 seconds
	_, err = scheduler.Every(5).Seconds().Tag(cron_id).Do(func() {
		checkIfPoolIsDeleted(id, cron_id)
	})

	if err != nil {
		ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolDestroyFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// subprocess.Run("sudo", "zfs", "destroy", "-Rr", pool_name)

	// Destroy the pool
	response := subprocess.Run("sudo", "zpool", "destroy", "-f", pool_name)

	if response.ExitCode != 0 {
		// delete the cron job
		query = fmt.Sprintf("DELETE FROM CRONJOB WHERE Id = '%s'", cron_id)
		conn.Exec(query)
		scheduler.RemoveByTag(cron_id)

		ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolDestroyFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	// change pool status to "Removing"
	query = fmt.Sprintf("UPDATE ZPOOLS SET Health = 'REMOVING' WHERE Id = '%s'", id)
	conn.Exec(query)

	format.JSON(w, http.StatusOK, "Pool deleted")
}

func checkIfPoolIsDeleted(pool_id string, cron_id string) {
	var pool_name string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", pool_id)
	err := conn.QueryRow(query).Scan(&pool_name)

	if err != nil {
		return
	}

	response := subprocess.Run("sudo", "zpool", "status", "-v", pool_name)

	if response.ExitCode == 0 {
		fmt.Println(response.StdOut)
		return
	} else {
		fmt.Println(response.StdErr)
	}

	// select PartUuid from PARTITIONS table where PoolRefId = id
	query = fmt.Sprintf("SELECT PartUuid FROM PARTITIONS WHERE PoolRefId = '%s'", pool_id)
	rows, err := conn.Query(query)

	if err == nil {
		defer rows.Close()

		for rows.Next() {
			var partuuid string
			err := rows.Scan(&partuuid)

			if err != nil {
				continue
			}

			// select disk where partuuid = partuuid
			var disk string
			query = fmt.Sprintf("SELECT Disk FROM PARTITIONS WHERE PartUuid = '%s'", partuuid)
			err = conn.QueryRow(query).Scan(&disk)

			if err != nil {
				continue
			}

			// Delete the partition
			// wipefs -a /dev/sdy
			response = subprocess.Run("sudo", "wipefs", "-a", "/dev/"+disk)

			if response.ExitCode != 0 {
				return
			}
		}
	}

	// Delete the rows from the PARTITIONS table
	query = fmt.Sprintf("DELETE FROM PARTITIONS WHERE PoolRefId = '%s'", pool_id)
	conn.Exec(query)

	// delete all ZSNAPSHOTS where DatasetRefId = (select Id from ZFILESYSTEMS where PoolRefId = id)
	query = fmt.Sprintf("DELETE FROM ZSNAPSHOTS WHERE DatasetRefId IN (SELECT Id FROM ZFILESYSTEMS WHERE PoolRefId = '%s')", pool_id)
	conn.Exec(query)

	// delete all ZSCRUB where poolRefId = id
	query = fmt.Sprintf("DELETE FROM ZSCRUB WHERE PoolRefId = '%s'", pool_id)
	conn.Exec(query)

	// delete all ZFILESYSTEMS where PoolRefId = id
	query = fmt.Sprintf("DELETE FROM ZFILESYSTEMS WHERE PoolRefId = '%s'", pool_id)
	conn.Exec(query)

	// delete all CRONJOBS where poolRefId = id
	// get id and remove scheduler job
	var cronjob_id string
	query = fmt.Sprintf("SELECT Id FROM CRONJOB WHERE PoolRefId = '%s' AND Operation = 'JOB-REMOVE-POOL'", pool_id)
	err = conn.QueryRow(query).Scan(&cronjob_id)

	if err == nil {
		scheduler.RemoveByTag(cronjob_id)

		query = fmt.Sprintf("DELETE FROM CRONJOB WHERE PoolRefId = '%s' AND Operation = 'JOB-REMOVE-POOL'", pool_id)
		conn.Exec(query)
	} else {
		scheduler.RemoveByTag(cron_id)
	}

	// Delete the row from the ZPOOLS table
	query = fmt.Sprintf("DELETE FROM ZPOOLS WHERE Id = '%s'", pool_id)
	conn.Exec(query)
}

// @Summary Check if datasets in pool are used by services
// @Description Check if datasets in pool are used by services
// @Tags storage
// @Produce json
// @Param id path string true "Pool ID"
// @Success 200 {string} string "Pool deleted"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/storage/pools/{id}/services [get]
func checkIfDatasetsInPoolAreUsedByServices(w http.ResponseWriter, r *http.Request) {
	// get pool id from url
	id := chi.URLParam(r, "id")

	// select ids of all zfilesystems where PoolRefId = id
	var zFilesystemIds []string
	query := fmt.Sprintf("SELECT Id FROM ZFILESYSTEMS WHERE PoolRefId = '%s'", id)
	rows, err := conn.Query(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	defer rows.Close()

	for rows.Next() {
		var zFilesystemId string
		err := rows.Scan(&zFilesystemId)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		zFilesystemIds = append(zFilesystemIds, zFilesystemId)
	}

	var services []string
	used := false
	for _, zFilesystemId := range zFilesystemIds {

		// check if there are entries in SMB_SHARES table with DatasetRefId = id
		var smbShareId string
		query := fmt.Sprintf("SELECT Id FROM SMB_SHARES WHERE DatasetRefId = '%s'", zFilesystemId)
		err := conn.QueryRow(query).Scan(&smbShareId)

		if err == nil {
			service := "SMB"
			// check is there is SMB in services,
			// if not add it to services
			if strings.Contains(strings.Join(services, ","), service) == false {
				services = append(services, service)
			}
			used = true
		}

		// check if there are entries in NFS_EXPORTS table with DatasetRefId = id
		var nfsShareId string
		query = fmt.Sprintf("SELECT Id FROM NFS_EXPORTS WHERE DatasetRefId = '%s'", zFilesystemId)
		err = conn.QueryRow(query).Scan(&nfsShareId)

		if err == nil {
			service := "NFS"
			// check is there is NFS in services,
			// if not add it to services
			if strings.Contains(strings.Join(services, ","), service) == false {
				services = append(services, service)
			}
			used = true
		}

		// check if there are entries in S3_CONF table with DatasetRefId = id
		var s3ConfId string
		query = fmt.Sprintf("SELECT Id FROM S3_CONF WHERE DatasetRefId = '%s'", zFilesystemId)
		err = conn.QueryRow(query).Scan(&s3ConfId)

		if err == nil {
			service := "S3"
			// check is there is S3 in services,
			// if not add it to services
			if strings.Contains(strings.Join(services, ","), service) == false {
				services = append(services, service)
			}
			used = true
		}
	}

	servicesString := strings.Join(services, ",")

	// if no entries found in any of the tables above, return false
	format.JSON(w, http.StatusOK, ZFilesystemCheckService{Used: used, Service: &servicesString})
}

type ZpoolStatus struct {
	ID      string        `json:"id"`
	Value   string        `json:"value"`
	Open    bool          `json:"open"`
	Status  *string       `json:"status,omitempty"`
	Read    *string       `json:"read,omitempty"`
	Write   *string       `json:"write,omitempty"`
	Cksum   *string       `json:"cksum,omitempty"`
	Comment *string       `json:"comment,omitempty"`
	Size    *string       `json:"size,omitempty"`
	Data    []ZpoolStatus `json:"data"`
}

func setValuesInPool(pool *ZpoolStatus, lineValues []string) {
	if len(lineValues) > 1 {
		pool.Status = &lineValues[1]
		if len(lineValues) > 2 {
			// check if lineValues[2] is a number, if so, it is the size
			// else it is a comment
			_, err := strconv.Atoi(lineValues[2])
			if err == nil {
				pool.Read = &lineValues[2]
				pool.Write = &lineValues[3]
				pool.Cksum = &lineValues[4]
				if len(lineValues) > 5 {
					comment := strings.Join(lineValues[5:], " ")
					pool.Comment = &comment
				}
			} else {
				comment := strings.Join(lineValues[2:], " ")
				pool.Comment = &comment
			}
		}
	}
}

// @Summary Show all disks in pool
// @Description Show all disks in pool
// @Tags storage
// @Produce json
// @Param id path string true "Pool ID"
// @Success 200 {array} ZpoolStatus
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/storage/pools/{id}/status [get]
func getPoolStatus(w http.ResponseWriter, r *http.Request) {
	// get pool id from url
	id := chi.URLParam(r, "id")

	// select pool name from ZPOOLS where id = id
	var poolName string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", id)
	err := conn.QueryRow(query).Scan(&poolName)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	response := subprocess.Run("sudo", "zpool", "status", poolName)

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	var pools []ZpoolStatus

	// lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")
	lines := strings.Split(response.StdOut, "\n")

	checkpoint := false // reached line starting with "NAME"
	counterLevel1 := 1  // level 1 counter
	counterLevel2 := 1  // level 2 counter
	counterLevel3 := 1  // level 3 counter
	counterLevel4 := 1  // level 4 counter
	for i, line := range lines {
		// line = strings.TrimSpace(line)
		if i == 0 || len(line) == 0 {
			continue
		}

		if strings.Contains(line, "NAME") {
			checkpoint = true
			continue
		}

		if strings.Contains(line, "errors:") {
			break
		}

		if checkpoint {
			line = strings.ReplaceAll(line, "\t", "")

			if strings.HasPrefix(line, "      ") {
				// level 4
				line = strings.TrimSpace(line)

				// a regular expression pattern to match multiple consecutive blank spaces
				pattern := regexp.MustCompile(`\s+`)

				line = pattern.ReplaceAllString(line, " ")

				var pool ZpoolStatus

				pool.ID = fmt.Sprintf("%d.%d.%d.%d", counterLevel1-1, counterLevel2-1, counterLevel3-1, counterLevel4)
				counterLevel4++
				lineValues := strings.Split(line, " ")
				pool.Value = lineValues[0]

				// check if pool.Value is a uuid, if so, select disk from PARTITIONS where PartUuid = pool.Value
				if IsUUID(pool.Value) {
					// get size of disk
					var size string
					query = fmt.Sprintf("SELECT DiskSize FROM PARTITIONS WHERE PartUuid = '%s'", pool.Value)
					err = conn.QueryRow(query).Scan(&size)

					if err == nil {
						pool.Size = &size
					}

					var disk string
					query := fmt.Sprintf("SELECT Disk FROM PARTITIONS WHERE PartUuid = '%s'", pool.Value)
					err := conn.QueryRow(query).Scan(&disk)

					if err == nil {
						pool.Value = disk
					}
				}

				pool.Open = true

				setValuesInPool(&pool, lineValues)

				pools[len(pools)-1].Data[len(pools[len(pools)-1].Data)-1].Data[len(pools[len(pools)-1].Data[len(pools[len(pools)-1].Data)-1].Data)-1].Data = append(pools[len(pools)-1].Data[len(pools[len(pools)-1].Data)-1].Data[len(pools[len(pools)-1].Data[len(pools[len(pools)-1].Data)-1].Data)-1].Data, pool)
			} else if strings.HasPrefix(line, "    ") {
				// level 3
				line = strings.TrimSpace(line)

				// a regular expression pattern to match multiple consecutive blank spaces
				pattern := regexp.MustCompile(`\s+`)

				line = pattern.ReplaceAllString(line, " ")

				counterLevel4 = 1

				var pool ZpoolStatus

				pool.ID = fmt.Sprintf("%d.%d.%d", counterLevel1-1, counterLevel2-1, counterLevel3)
				counterLevel3++
				lineValues := strings.Split(line, " ")
				pool.Value = lineValues[0]

				// check if pool.Value is a uuid, if so, select disk from PARTITIONS where PartUuid = pool.Value
				if IsUUID(pool.Value) {
					// get size of disk
					var size string
					query = fmt.Sprintf("SELECT DiskSize FROM PARTITIONS WHERE PartUuid = '%s'", pool.Value)
					err = conn.QueryRow(query).Scan(&size)

					if err == nil {
						pool.Size = &size
					}

					var disk string
					query := fmt.Sprintf("SELECT Disk FROM PARTITIONS WHERE PartUuid = '%s'", pool.Value)
					err := conn.QueryRow(query).Scan(&disk)

					if err == nil {
						pool.Value = disk
					}
				} else {
					// capitalize first letter
					pool.Value = strings.Title(pool.Value)
				}

				pool.Open = true

				setValuesInPool(&pool, lineValues)

				// pools = append(pools, pool)
				pools[len(pools)-1].Data[len(pools[len(pools)-1].Data)-1].Data = append(pools[len(pools)-1].Data[len(pools[len(pools)-1].Data)-1].Data, pool)
			} else if strings.HasPrefix(line, "  ") {
				// level 2
				line = strings.TrimSpace(line)

				// a regular expression pattern to match multiple consecutive blank spaces
				pattern := regexp.MustCompile(`\s+`)

				line = pattern.ReplaceAllString(line, " ")

				counterLevel3 = 1

				var pool ZpoolStatus

				pool.ID = fmt.Sprintf("%d.%d", counterLevel1-1, counterLevel2)
				counterLevel2++
				lineValues := strings.Split(line, " ")
				pool.Value = lineValues[0]

				// check if pool.Value is a uuid, if so, select disk from PARTITIONS where PartUuid = pool.Value
				if IsUUID(pool.Value) {
					// get size of disk
					var size string
					query = fmt.Sprintf("SELECT DiskSize FROM PARTITIONS WHERE PartUuid = '%s'", pool.Value)
					err = conn.QueryRow(query).Scan(&size)

					if err == nil {
						pool.Size = &size
					}

					var disk string
					query := fmt.Sprintf("SELECT Disk FROM PARTITIONS WHERE PartUuid = '%s'", pool.Value)
					err := conn.QueryRow(query).Scan(&disk)

					if err == nil {
						pool.Value = disk
					}
				} else {
					// if raidz1 --> RAID5
					// if raidz2 --> RAID6
					if strings.Contains(pool.Value, "raidz1") {
						pool.Value = strings.Replace(pool.Value, "raidz1", "RAID5", 1)
						// capitalize first letter
						pool.Value = strings.Title(pool.Value)
					} else if strings.Contains(pool.Value, "raidz2") {
						pool.Value = strings.Replace(pool.Value, "raidz2", "RAID6", 1)
						// capitalize first letter
						pool.Value = strings.Title(pool.Value)
					} else {
						// capitalize first letter
						pool.Value = strings.Title(pool.Value)
					}
				}

				pool.Open = true

				setValuesInPool(&pool, lineValues)

				// pools = append(pools, pool)
				pools[len(pools)-1].Data = append(pools[len(pools)-1].Data, pool)
			} else {
				// level 1
				line = strings.TrimSpace(line)

				// a regular expression pattern to match multiple consecutive blank spaces
				pattern := regexp.MustCompile(`\s+`)

				line = pattern.ReplaceAllString(line, " ")

				counterLevel2 = 1

				var pool ZpoolStatus

				pool.ID = fmt.Sprintf("%d", counterLevel1)
				counterLevel1++

				lineValues := strings.Split(line, " ")
				pool.Value = lineValues[0]

				// to uppercase
				pool.Value = strings.ToUpper(pool.Value)
				if pool.ID == "1" {
					pool.Value = "DATA"
				}

				if pool.Value == "LOGS" {
					pool.Value = "JOURNAL"
				}

				pool.Open = true

				setValuesInPool(&pool, lineValues)

				pools = append(pools, pool)
			}
		}
	}

	format.JSON(w, http.StatusOK, pools)
}

func IsUUID(input string) bool {
	// Regular expression pattern for UUID
	uuidPattern := `^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`
	match, _ := regexp.MatchString(uuidPattern, input)
	return match
}

type NewDiskGroup struct {
	Configuration string   `json:"configuration"`
	Disks         []string `json:"disks"`
}

type AddDiskGroups struct {
	DiskGroups []NewDiskGroup `json:"diskGroups"`
}

// @Summary Add new disk group to pool
// @Description Add new disk group to pool
// @Tags storage
// @Accept json
// @Produce json
// @Param diskGroup body AddDiskGroups true "DiskGroups"
// @Param id path string true "Pool ID"
// @Success 200 {object} Response "Successfully added new disk group"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/storage/pools/{id}/diskgroups [post]
func addNewDiskGroup(w http.ResponseWriter, r *http.Request) {
	poolId := chi.URLParam(r, "id")

	var diskGroups AddDiskGroups
	_ = json.NewDecoder(r.Body).Decode(&diskGroups)

	var poolName string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", poolId)
	err := conn.QueryRow(query).Scan(&poolName)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to add a new disk group to pool '%s'", LogProcessName, "admin", poolName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: poolName,
	}

	// create partition for each disk
	for _, diskGroup := range diskGroups.DiskGroups {
		for _, disk := range diskGroup.Disks {
			err := createPartition(disk)

			if err != nil {
				format.JSON(w, http.StatusInternalServerError, err.Error())
				return
			}
		}
	}

	// get the partuuids of the partitions
	var partuuids []string
	for _, diskGroup := range diskGroups.DiskGroups {
		for _, disk := range diskGroup.Disks {
			err := savePartitionToDatabase(disk, diskGroup.Configuration, &partuuids, &poolId)

			if err != nil {
				deletePartitions(partuuids)

				format.JSON(w, http.StatusInternalServerError, err.Error())
				return
			}
		}
	}

	// add a new disk group to pool
	command := "sudo zpool add " + poolName + " "
	for i, diskGroup := range diskGroups.DiskGroups {
		if diskGroup.Configuration != "" {
			command += diskGroup.Configuration + " "
		}
		for j, _ := range diskGroup.Disks {
			command += partuuids[i*len(diskGroup.Disks)+j] + " "
		}
	}
	response := subprocess.Run("sudo", "sh", "-c", command)

	if response.ExitCode != 0 {
		deletePartitions(partuuids)

		for _, diskGroup := range diskGroups.DiskGroups {
			if diskGroup.Configuration == "log" {
				ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolAddLogDiskFail, logVariables)
			} else if diskGroup.Configuration == "cache" {
				ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolAddCacheDiskFail, logVariables)
			} else if diskGroup.Configuration == "spare" {
				ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolAddSpareDiskFail, logVariables)
			} else {
				ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolAddDiskGroupFail, logVariables)
			}
		}

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	for _, diskGroup := range diskGroups.DiskGroups {
		if diskGroup.Configuration == "log" {
			ZPoolLogMessage(LogPriority.Info, zPoolLogMessageId.ZPoolAddLogDisk, logVariables)
		} else if diskGroup.Configuration == "cache" {
			ZPoolLogMessage(LogPriority.Info, zPoolLogMessageId.ZPoolAddCacheDisk, logVariables)
		} else if diskGroup.Configuration == "spare" {
			ZPoolLogMessage(LogPriority.Info, zPoolLogMessageId.ZPoolAddSpareDisk, logVariables)
		} else {
			ZPoolLogMessage(LogPriority.Info, zPoolLogMessageId.ZPoolAddDiskGroup, logVariables)
		}
	}

	format.JSON(w, http.StatusOK, "Added a new disk group to pool")
}

type DeleteDiskGroup struct {
	DiskGroupName string   `json:"diskGroupName"`
	Disks         []string `json:"disks"`
}

// @Summary Delete disk group from pool
// @Description Delete disk group from pool
// @Tags storage
// @Accept json
// @Produce json
// @Param diskGroup body DeleteDiskGroup true "DiskGroup"
// @Param id path string true "Pool ID"
// @Success 200 {object} Response "Successfully deleted disk group"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/storage/pools/{id}/diskgroups [delete]
func deleteDiskGroup(w http.ResponseWriter, r *http.Request) {
	pool_id := chi.URLParam(r, "id")

	// get pool name from pool id
	var poolName string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", pool_id)
	err := conn.QueryRow(query).Scan(&poolName)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to delete a disk group from pool '%s'", LogProcessName, "admin", poolName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: poolName,
	}

	var diskGroup DeleteDiskGroup
	_ = json.NewDecoder(r.Body).Decode(&diskGroup)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// if disk group name is not empty, delete the disk group
	// else find partuuids of the disks and delete them
	if diskGroup.DiskGroupName != "" {
		// delete the disk group from pool
		command := "sudo zpool remove " + poolName + " " + diskGroup.DiskGroupName
		response := subprocess.Run("sudo", "sh", "-c", command)

		if response.ExitCode != 0 {
			ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolRemoveDiskGroupFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}

		// delete partitions from the disk group
		for _, disk := range diskGroup.Disks {
			// find partuuid of the disk
			response := subprocess.Run("sudo", "lsblk", "-n", "-o", "PARTUUID", "-r", "/dev/"+disk)

			if response.ExitCode != 0 {
				ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolRemoveDiskGroupFail, logVariables)

				format.JSON(w, http.StatusInternalServerError, response.StdErr)
				return
			}

			lines := strings.Split(response.StdOut, "\n")
			partuuid := strings.TrimSpace(lines[1])

			deletePartitions([]string{partuuid})

			ZPoolLogMessage(LogPriority.Info, zPoolLogMessageId.ZPoolRemoveDiskGroup, logVariables)
		}
	} else {
		for _, disk := range diskGroup.Disks {
			// find partuuid of the disk
			response := subprocess.Run("sudo", "lsblk", "-n", "-o", "PARTUUID", "-r", "/dev/"+disk)

			if response.ExitCode != 0 {
				format.JSON(w, http.StatusInternalServerError, response.StdErr)
				return
			}

			lines := strings.Split(response.StdOut, "\n")
			partuuid := strings.TrimSpace(lines[1])

			// delete the partition from the pool
			command := "sudo zpool remove " + poolName + " " + partuuid

			response = subprocess.Run("sudo", "sh", "-c", command)

			// select configuration by partuuid from db
			var configuration string
			query := fmt.Sprintf("SELECT Configuration FROM PARTITIONS WHERE PartUuid = '%s'", partuuid)
			_ = conn.QueryRow(query).Scan(&configuration)

			if response.ExitCode != 0 {
				if configuration == "log" {
					ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolRemoveLogDiskFail, logVariables)
				} else if configuration == "cache" {
					ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolRemoveCacheDiskFail, logVariables)
				} else if configuration == "spare" {
					ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolRemoveSpareDiskFail, logVariables)
				} else {
					ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolRemoveDiskGroupFail, logVariables)
				}

				format.JSON(w, http.StatusInternalServerError, response.StdErr)
				return
			}

			if configuration == "log" {
				ZPoolLogMessage(LogPriority.Info, zPoolLogMessageId.ZPoolRemoveLogDisk, logVariables)
			} else if configuration == "cache" {
				ZPoolLogMessage(LogPriority.Info, zPoolLogMessageId.ZPoolRemoveCacheDisk, logVariables)
			} else if configuration == "spare" {
				ZPoolLogMessage(LogPriority.Info, zPoolLogMessageId.ZPoolRemoveSpareDisk, logVariables)
			} else {
				ZPoolLogMessage(LogPriority.Info, zPoolLogMessageId.ZPoolRemoveDiskGroup, logVariables)
			}

			deletePartitions([]string{partuuid})
		}
	}

	format.JSON(w, http.StatusOK, "Deleted disk group from pool")
}

// @Summary Get failed pool status
// @Description Get failed pool status
// @Tags storage
// @Accept json
// @Produce json
// @Param id path string true "Pool ID"
// @Success 200 {object} Response "Successfully retrieved pool status"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/storage/pools/{id}/failed-status [get]
func getFailedStatus(w http.ResponseWriter, r *http.Request) {
	pool_id := chi.URLParam(r, "id")

	// get pool name from pool id
	var poolName string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", pool_id)
	err := conn.QueryRow(query).Scan(&poolName)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	response := subprocess.Run("sudo", "zpool", "status", poolName)

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	status := extractStatus(response.StdOut)

	format.JSON(w, http.StatusOK, status)
}

func extractStatus(output string) string {
	startMarker := "status:"
	endMarker := "action:"
	lines := strings.Split(output, "\n")

	var statusLines []string
	foundStart := false

	for _, line := range lines {
		if strings.HasPrefix(line, startMarker) {
			foundStart = true
		}

		if strings.HasPrefix(line, endMarker) {
			break
		}

		if foundStart {
			// remove all /n and /t
			statusLines = append(statusLines, line)
		}
	}

	resultString := strings.TrimSpace(strings.Join(statusLines, "\n"))

	// remove "status: " from the start
	resultString = strings.ReplaceAll(resultString, "status:", "Storage Status:")
	// remove all /n and /t
	resultString = strings.TrimSpace(resultString)
	// resultString = strings.ReplaceAll(resultString, "\n", "")
	resultString = strings.ReplaceAll(resultString, "\t", "")

	return resultString
}

// @Summary Check if pool name is available
// @Description Check if pool name is available
// @Tags storage
// @Accept json
// @Produce json
// @Param name path string true "Pool name"
// @Success 200 {object} Response "Successfully checked if pool name is available"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/storage/pools/check/{name} [get]
func checkIfPoolNameIsAvailable(w http.ResponseWriter, r *http.Request) {
	pool_name := chi.URLParam(r, "name")

	// check if pool already exists in zfs
	response := subprocess.Run("sudo", "zpool", "list", "-H", "-o", "name", pool_name)

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusOK, true)
		return
	} else {
		format.JSON(w, http.StatusOK, false)
		return
	}
}

// @Summary Export pool
// @Description Export pool
// @Tags storage
// @Accept json
// @Produce json
// @Param id path string true "Pool ID"
// @Success 200 {object} Response "Successfully exported pool"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/storage/pools/{id}/export [post]
func exportPool(w http.ResponseWriter, r *http.Request) {
	pool_id := chi.URLParam(r, "id")

	var s3_conf S3Configuration
	query := "SELECT * FROM S3_CONF LIMIT 1"
	err := conn.Get(&s3_conf, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	if s3_conf.DatasetRefId != nil {
		var id string
		query = fmt.Sprintf("SELECT PoolRefId FROM ZFILESYSTEMS WHERE Id = '%s'", *s3_conf.DatasetRefId)
		err = conn.QueryRow(query).Scan(&id)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		if id == pool_id {
			format.JSON(w, http.StatusInternalServerError, "Cannot export pool, S3 is enabled")
			return
		}
	}

	// get pool name from pool id
	var poolName string
	query = fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", pool_id)
	err = conn.QueryRow(query).Scan(&poolName)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to export pool '%s'", LogProcessName, "admin", poolName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: poolName,
	}

	// export pool
	response := subprocess.Run("sudo", "zpool", "export", "-f", poolName)
	if response.ExitCode != 0 {
		ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolExportFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	query = fmt.Sprintf("UPDATE SMB_SHARES SET Enable = 'n' WHERE DatasetRefId IN (SELECT Id FROM ZFILESYSTEMS WHERE PoolRefId = '%s')", pool_id)
	conn.Exec(query)

	query = fmt.Sprintf("UPDATE NFS_EXPORTS SET Enable = 'n' WHERE DatasetRefId IN (SELECT Id FROM ZFILESYSTEMS WHERE PoolRefId = '%s')", pool_id)
	conn.Exec(query)

	updateSMB()
	updateNFSExports()

	ZPoolLogMessage(LogPriority.Info, zPoolLogMessageId.ZPoolExport, logVariables)

	format.JSON(w, http.StatusOK, "Pool exported successfully")
}

// @Summary Import pool
// @Description Import pool
// @Tags storage
// @Accept json
// @Produce json
// @Param id path string true "Pool ID"
// @Success 200 {object} Response "Successfully imported pool"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/storage/pools/{id}/import [post]
func importPool(w http.ResponseWriter, r *http.Request) {
	pool_id := chi.URLParam(r, "id")

	// get pool name from pool id
	var poolName string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", pool_id)
	err := conn.QueryRow(query).Scan(&poolName)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to import pool '%s'", LogProcessName, "admin", poolName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: poolName,
	}

	// import pool
	response := subprocess.Run("sudo", "zpool", "import", poolName)
	if response.ExitCode != 0 {
		ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolImportFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	ZPoolLogMessage(LogPriority.Info, zPoolLogMessageId.ZPoolImport, logVariables)

	format.JSON(w, http.StatusOK, "Pool imported successfully")
}

func checkIfPoolIsExported(poolName string) bool {
	response := subprocess.Run("sudo", "zpool", "import")
	if response.ExitCode != 0 {
		return false
	}
	lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")
	for _, line := range lines {
		if strings.Contains(line, "pool: "+poolName) {
			return true
		}
	}
	return false
}

type PoolToImport struct {
	Id   string `json:"id"`
	Name string `json:"name"`
	Log  string `json:"log"`
}

// @Summary Get import list
// @Description Get import list
// @Tags storage
// @Accept json
// @Produce json
// @Success 200 {object} Response "Successfully retrieved import list"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/storage/pools/import-list [get]
func getImportList(w http.ResponseWriter, r *http.Request) {
	response := subprocess.Run("sudo", "zpool", "import")

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")

	pools := []PoolToImport{}
	var startMarker = "pool: "
	var logLines []string

	for i, line := range lines {
		// delete all /t and trim spaces
		line = strings.TrimSpace(strings.ReplaceAll(line, "\t", ""))
		// replace multiple consecutive blank spaces with a single blank space
		pattern := regexp.MustCompile(`\s+`)
		line = pattern.ReplaceAllString(line, " ")
		if strings.HasPrefix(line, startMarker) {
			var pool PoolToImport
			pool.Name = strings.TrimSpace(strings.ReplaceAll(line, startMarker, ""))
			// find pool id by pool name from db
			id := ""
			query := fmt.Sprintf("SELECT Id FROM ZPOOLS WHERE Name = '%s'", pool.Name)
			conn.QueryRow(query).Scan(&id)

			if id != "" {
				pool.Id = id
			}

			if len(logLines) > 0 {
				if len(pools) > 0 {
					pools[len(pools)-1].Log = strings.Join(logLines, "\n")
				}
			}

			pools = append(pools, pool)

			// initialize logLines
			logLines = []string{}
			logLines = append(logLines, line)
		} else {
			logLines = append(logLines, line)
		}

		if i == len(lines)-1 {
			if len(pools) > 0 {
				pools[len(pools)-1].Log = strings.Join(logLines, "\n")
			}
		}
	}

	format.JSON(w, http.StatusOK, pools)
}

type PoolsToImport struct {
	Pools []string `json:"pools_to_import"`
}

// @Summary Import pool list
// @Description Import pool list
// @Tags storage
// @Accept json
// @Produce json
// @Param poolNames body []string true "Pool names"
// @Success 200 {object} Response "Successfully imported pool list"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/storage/pools/import-list [post]
func importPoolList(w http.ResponseWriter, r *http.Request) {
	var poolsToImport PoolsToImport
	err := json.NewDecoder(r.Body).Decode(&poolsToImport)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// import pool
	for _, poolName := range poolsToImport.Pools {
		response := subprocess.Run("sudo", "zpool", "import", poolName)
		if response.ExitCode != 0 {
			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
	}

	format.JSON(w, http.StatusOK, "Pools imported successfully")
}

type DiskReplacement struct {
	OldDisk string `json:"old_disk"`
	NewDisk string `json:"new_disk"`
}

// @Summary Replace disk
// @Description Replace disk
// @Tags storage
// @Accept json
// @Produce json
// @Param id path string true "Pool ID"
// @Param diskReplacement body DiskReplacement true "DiskReplacement"
// @Success 200 {object} Response "Successfully replaced disk"
// @Failure 400 {object} Response "Invalid request"
// @Failure 500 {object} Response "Internal server error"
// @Router /api/storage/pools/{id}/replace-disk [post]
func replaceDisk(w http.ResponseWriter, r *http.Request) {
	pool_id := chi.URLParam(r, "id")

	// get DiskReplacement struct from request body
	var diskReplacement DiskReplacement
	err := json.NewDecoder(r.Body).Decode(&diskReplacement)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// get pool name from pool id
	var poolName string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", pool_id)
	err = conn.QueryRow(query).Scan(&poolName)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to replace disk '%s' with disk '%s' in pool '%s'", LogProcessName, "admin", diskReplacement.OldDisk, diskReplacement.NewDisk, poolName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: poolName,
		TargetValues: []string{
			diskReplacement.OldDisk,
			diskReplacement.NewDisk,
		},
	}

	// get id from PARTITIONS table by old disk name
	var oldDiskId string
	query = fmt.Sprintf("SELECT Id FROM PARTITIONS WHERE Disk = '%s'", diskReplacement.OldDisk)
	err = conn.QueryRow(query).Scan(&oldDiskId)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// get configuration from PARTITIONS table by old disk id
	var configuration string
	query = fmt.Sprintf("SELECT Configuration FROM PARTITIONS WHERE Id = '%s'", oldDiskId)
	err = conn.QueryRow(query).Scan(&configuration)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// create partition for new disk
	err = createPartition(diskReplacement.NewDisk)

	if err != nil {
		ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolDiskReplaceFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// save partition to database
	var partuuids []string
	err = savePartitionToDatabase(diskReplacement.NewDisk, configuration, &partuuids, &pool_id)

	if err != nil {
		deletePartitions(partuuids)

		ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolDiskReplaceFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// get partuuid of the old disk
	var oldDiskPartuuid string
	query = fmt.Sprintf("SELECT PartUuid FROM PARTITIONS WHERE Id = '%s'", oldDiskId)
	err = conn.QueryRow(query).Scan(&oldDiskPartuuid)

	if err != nil {
		deletePartitions(partuuids)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// insert new cron job
	cron_id := uuid.New().String()
	// insert new cron job
	query = fmt.Sprintf("INSERT INTO CRONJOB (Id, Operation, PartitionRefId, RepeatType, EverySecond) VALUES ('%s', 'JOB-REPLACE-POOL', '%s', 'SECOND', 5)", cron_id, oldDiskId)
	conn.Exec(query)
	// check on scrub processes every 5 seconds
	_, err = scheduler.Every(5).Seconds().Tag(cron_id).Do(func() {
		err := checkIfDiskReplaced(oldDiskId, cron_id)
		if err == nil {
			// log disk replacement success
			ZPoolLogMessage(LogPriority.Info, zPoolLogMessageId.ZPoolDiskReplace, logVariables)
		}
	})

	if err != nil {
		deletePartitions(partuuids)

		ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolDiskReplaceFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// replace disk
	response := subprocess.Run("sudo", "zpool", "replace", poolName, oldDiskPartuuid, partuuids[0])

	if response.ExitCode != 0 {
		// delete cron job
		query = fmt.Sprintf("DELETE FROM CRONJOB WHERE Id = '%s'", cron_id)
		conn.Exec(query)
		scheduler.RemoveByTag(cron_id)

		deletePartitions(partuuids)

		ZPoolLogMessage(LogPriority.Error, zPoolLogMessageId.ZPoolDiskReplaceFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	format.JSON(w, http.StatusOK, "Disk replaced successfully")
}

func checkIfDiskReplaced(partition_id string, cron_id string) error {
	// get pool name from pool id in PARTITIONS table
	var poolName string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = (SELECT PoolRefId FROM PARTITIONS WHERE Id = '%s')", partition_id)
	err := conn.QueryRow(query).Scan(&poolName)

	if err != nil {
		return err
	}

	var partUuid string
	query = fmt.Sprintf("SELECT PartUuid FROM PARTITIONS WHERE Id = '%s'", partition_id)
	err = conn.QueryRow(query).Scan(&partUuid)

	if err != nil {
		return err
	}

	// check if disk has been replaced
	response := subprocess.Run("sudo", "zpool", "status", poolName)

	if response.ExitCode != 0 {
		return errors.New(response.StdErr)
	}

	lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")

	for _, line := range lines {
		// if line contains partition id, return
		if strings.Contains(line, partUuid) {
			return errors.New("Disk has not been replaced yet")
		}
	}

	query = fmt.Sprintf("DELETE FROM CRONJOB WHERE Id = '%s'", cron_id)
	conn.Exec(query)

	deletePartitions([]string{partUuid})

	scheduler.RemoveByTag(cron_id)

	return nil
}
