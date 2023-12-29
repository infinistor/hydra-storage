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
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi"
	"github.com/go-co-op/gocron"
	"github.com/google/uuid"
	"gopkg.in/pygz/subprocess.v1"
)

type CronJob struct {
	Id             string  `json:"id" db:"Id"`
	Operation      *string `json:"operation" db:"Operation"`
	PoolRefId      *string `json:"poolRefId" db:"PoolRefId"`
	DatasetRefId   *string `json:"datasetRefId" db:"DatasetRefId"`
	PartitionRefId *string `json:"partitionRefId" db:"PartitionRefId"`
	RepeatType     *string `json:"repeatType" db:"RepeatType"`
	EverySecond    *int    `json:"everySecond" db:"EverySecond"`
	CrontabString  *string `json:"crontabString" db:"CrontabString"`
}

func initializeScheduler() error {
	// get all cron jobs from database
	cronJobs := []CronJob{}
	conn.Select(&cronJobs, "SELECT * FROM CRONJOB")

	monJob := CronJob{}
	if len(cronJobs) > 0 {
		for _, cronJob := range cronJobs {
			if *cronJob.Operation == "MON-SCRUB" {
				monJob = cronJob
				break
			}
		}
	}

	scheduler = gocron.NewScheduler(time.Local)
	if monJob == (CronJob{}) {
		id := uuid.New().String()
		// insert new cron job
		query := fmt.Sprintf("INSERT INTO CRONJOB (Id, Operation, RepeatType, EverySecond) VALUES ('%s', 'MON-SCRUB', 'SECOND', 5)", id)
		_, err := conn.Exec(query)
		if err != nil {
			return err
		}
		// check on scrub processes every 5 seconds
		_, err = scheduler.Every(5).Seconds().Tag(id).Do(checkScrubStatusOfPools)
		if err != nil {
			return err
		}
	} else {
		// initialize job with existing cron job
		var seconds = monJob.EverySecond
		if seconds == nil {
			seconds = new(int)
			*seconds = 5 // every 5 seconds
		}
		_, err := scheduler.Every(*seconds).Seconds().Tag(monJob.Id).Do(checkScrubStatusOfPools)
		if err != nil {
			return err
		}
	}

	// start all jobs
	if len(cronJobs) > 0 {
		for _, cronJob := range cronJobs {
			if cronJob.Operation != nil && *cronJob.Operation == "JOB-SCRUB" {
				if cronJob.CrontabString == nil || cronJob.PoolRefId == nil {
					continue
				}
				// initialize job with existing cron job
				var crontabString = *cronJob.CrontabString
				var poolRefId = *cronJob.PoolRefId
				var tag = cronJob.Id
				_, err := scheduler.Cron(crontabString).Tag(tag).Do(func() {
					err := scrubPool(poolRefId)
					if err != nil {
						fmt.Println(err.Error())
					}
				})
				if err != nil {
					return err
				}
			} else if cronJob.Operation != nil && *cronJob.Operation == "JOB-REMOVE-POOL" {
				_, err := scheduler.Every(*cronJob.EverySecond).Seconds().Tag(cronJob.Id).Do(func() {
					checkIfPoolIsDeleted(*cronJob.PoolRefId, cronJob.Id)
				})
				if err != nil {
					return err
				}
			} else if cronJob.Operation != nil && *cronJob.Operation == "JOB-REPLACE-POOL" {
				_, err := scheduler.Every(*cronJob.EverySecond).Seconds().Tag(cronJob.Id).Do(func() {
					checkIfDiskReplaced(*cronJob.PartitionRefId, cronJob.Id)
				})
				if err != nil {
					return err
				}
			}
		}
	}

	// starts the scheduler asynchronously
	scheduler.StartAsync()
	return nil
}

// @Summary Show scrub scheduler by pool id
// @Description get scrub scheduler by pool id
// @Tags scrub
// @Accept  json
// @Produce  json
// @Param id path string true "Pool Id"
// @Success 200 {object} CronJob
// @Router /api/storage/pools/{id}/scrub-scheduler [get]
func getScrubScheduler(w http.ResponseWriter, r *http.Request) {
	pool_id := chi.URLParam(r, "id")

	// get all cron jobs from database
	cronJob := CronJob{}
	query := fmt.Sprintf("SELECT * FROM CRONJOB WHERE PoolRefId = '%s' LIMIT 1", pool_id)
	err := conn.Get(&cronJob, query)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// return the cron job
	format.JSON(w, http.StatusOK, cronJob)
}

type CronJob_POST struct {
	RepeatType    string `json:"repeat_type" db:"RepeatType"`
	CrontabString string `json:"crontab_string" db:"CrontabString"`
}

// @Summary Create / update scrub scheduler by pool id
// @Description create / update scrub scheduler by pool id
// @Tags scrub
// @Accept  json
// @Produce  json
// @Param id path string true "Pool Id"
// @Param cronJob body CronJob_POST true "Cron Job"
// @Success 200 {object} CronJob
// @Router /api/storage/pools/{id}/scrub [post]
func createScrubScheduler(w http.ResponseWriter, r *http.Request) {
	pool_id := chi.URLParam(r, "id")

	// get CronJob_POST from body
	var cronJob_POST CronJob_POST
	err := json.NewDecoder(r.Body).Decode(&cronJob_POST)

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

	// get cron job with pool id
	var count int
	query = fmt.Sprintf("SELECT COUNT(*) FROM CRONJOB WHERE PoolRefId = '%s'", pool_id)
	err = conn.Get(&count, query)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to start a scrub scheduler for pool '%s'", LogProcessName, "admin", poolName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: poolName,
	}

	// if cron job exists, update it
	if count == 1 {
		// get cron job id with pool id
		cronJob := CronJob{}
		query := fmt.Sprintf("SELECT * FROM CRONJOB WHERE PoolRefId = '%s'", pool_id)
		err = conn.Get(&cronJob, query)

		if err != nil {
			ZScrubLogMessage(LogPriority.Error, zScrubLogMessageId.ZScrubSchedulerStartFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		query = fmt.Sprintf("UPDATE CRONJOB SET RepeatType = '%s', CrontabString = '%s' WHERE Id = '%s'", cronJob_POST.RepeatType, cronJob_POST.CrontabString, cronJob.Id)
		_, err = conn.Exec(query)

		if err != nil {
			ZScrubLogMessage(LogPriority.Error, zScrubLogMessageId.ZScrubSchedulerStartFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		scheduler.RemoveByTag(cronJob.Id)

		if cronJob_POST.CrontabString == "" {
			ZScrubLogMessage(LogPriority.Info, zScrubLogMessageId.ZScrubSchedulerStop, logVariables)

			format.JSON(w, http.StatusOK, "Scrub scheduler removed")
			return
		}

		_, err = scheduler.Cron(cronJob_POST.CrontabString).Tag(cronJob.Id).Do(func() {
			err := scrubPool(pool_id)
			if err != nil {
				fmt.Println(err.Error())
			} else {
				ZScrubLogMessage(LogPriority.Info, zScrubLogMessageId.ZScrubStart, logVariables)
			}
		})

		if err != nil {
			ZScrubLogMessage(LogPriority.Error, zScrubLogMessageId.ZScrubSchedulerStartFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	} else if count == 0 {
		// create new cron job
		id := uuid.New().String()
		query := fmt.Sprintf("INSERT INTO CRONJOB (Id, Operation, PoolRefId, RepeatType, CrontabString) VALUES ('%s', 'JOB-SCRUB', '%s', '%s', '%s')", id, pool_id, cronJob_POST.RepeatType, cronJob_POST.CrontabString)
		_, err = conn.Exec(query)

		if err != nil {
			ZScrubLogMessage(LogPriority.Error, zScrubLogMessageId.ZScrubSchedulerStartFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		if cronJob_POST.CrontabString == "" {
			ZScrubLogMessage(LogPriority.Info, zScrubLogMessageId.ZScrubSchedulerStop, logVariables)

			format.JSON(w, http.StatusOK, "Scrub scheduler removed")
			return
		}

		_, err = scheduler.Cron(cronJob_POST.CrontabString).Tag(id).Do(func() {
			err := scrubPool(pool_id)
			if err != nil {
				fmt.Println(err.Error())
			} else {
				ZScrubLogMessage(LogPriority.Info, zScrubLogMessageId.ZScrubStart, logVariables)
			}
		})
		if err != nil {
			ZScrubLogMessage(LogPriority.Error, zScrubLogMessageId.ZScrubSchedulerStartFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	ZScrubLogMessage(LogPriority.Info, zScrubLogMessageId.ZScrubSchedulerStart, logVariables)
	format.JSON(w, http.StatusOK, "Scrub scheduler created / updated")
}

type ZScrub struct {
	Id                string     `json:"id" db:"Id"`
	PoolRefId         *string    `json:"pool_ref_id" db:"PoolRefId"`
	StartTime         *time.Time `json:"start_time" db:"StartTime"`
	EndTime           *time.Time `json:"end_time" db:"EndTime"`
	Status            *string    `json:"status" db:"Status"`
	Scanned           *string    `json:"scanned" db:"Scanned"`
	Issued            *string    `json:"issued" db:"Issued"`
	Total             *string    `json:"total" db:"Total"`
	Repaired          *string    `json:"repaired" db:"Repaired"`
	Errors            *string    `json:"errors" db:"Errors"`
	CompletionPercent *string    `json:"completion_percent" db:"CompletionPercent"`
	ProgressTime      *string    `json:"progress_time" db:"ProgressTime"`
	Log               *string    `json:"log" db:"Log"`
}

func scrubPool(pool_id string) error {
	// get pool name from pool id
	var poolName string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", pool_id)
	err := conn.QueryRow(query).Scan(&poolName)

	if err != nil {
		return err
	}

	logVariables := LogVariables{
		ObjectName: poolName,
	}

	// generate uuid
	uuid := uuid.New().String()

	// insert scrub into database
	query = fmt.Sprintf("INSERT INTO ZSCRUB (Id, PoolRefId, StartTime, Status) VALUES ('%s', '%s', '%s', '%s')", uuid, pool_id, time.Now().Format("2006-01-02 15:04:05"), "Initiated")
	_, err = conn.Exec(query)

	if err != nil {
		ZScrubLogMessage(LogPriority.Error, zScrubLogMessageId.ZScrubStartFail, logVariables)

		return err
	}

	response := subprocess.Run("sudo", "zpool", "scrub", poolName)

	if response.ExitCode != 0 {
		fmt.Println("Failed to start scrub")
		// update scrub status in database
		// remove all /n, /t, '
		response.StdErr = strings.ReplaceAll(response.StdErr, "\n", "")
		response.StdErr = strings.ReplaceAll(response.StdErr, "\t", "")
		response.StdErr = strings.ReplaceAll(response.StdErr, "'", "")
		query = fmt.Sprintf("UPDATE ZSCRUB SET Status = '%s', Log = '%s' WHERE Id = '%s'", "Failed to start", response.StdErr, uuid)
		conn.Exec(query)

		ZScrubLogMessage(LogPriority.Error, zScrubLogMessageId.ZScrubStartFail, logVariables)

		return errors.New(response.StdErr)
	}

	// check if any scrub on this pool is already running and update their status to "Unknown"
	query = fmt.Sprintf("UPDATE ZSCRUB SET Status = '%s' WHERE PoolRefId = '%s' AND Status = '%s'", "Unknown", pool_id, "In Progress")
	conn.Exec(query)

	// update scrub status in database
	query = fmt.Sprintf("UPDATE ZSCRUB SET Status = '%s' WHERE Id = '%s'", "In Progress", uuid)
	conn.Exec(query)

	// check if scrub is finished
	// if finished, update status in database
	// if not finished, update status in database
	// if failed, update status in database
	response = subprocess.Run("sudo", "zpool", "status", poolName)

	if response.ExitCode != 0 {
		return errors.New("Failed to get scrub status")
	}

	scan := extractScan(response.StdOut)

	if !strings.Contains(scan, "scan: scrub") {
		return errors.New("Failed to get scrub status")
	}

	err = saveScrubInfoToDB(scan, uuid)
	if err != nil {
		return err
	}

	return nil
}

type ScrubStatus struct {
	Status  string `json:"status"`
	LastRun string `json:"last_run"`
	NextRun string `json:"next_run"`
}

// @Summary Get scrub status
// @Description Get scrub status
// @Tags scrub
// @Accept  json
// @Produce  json
// @Param pool_id path string true "Pool ID"
// @Success 200 {object} ScrubStatus "Scrub status"
// @Router /api/storage/pools/{id}/scrub [get]
func getScrubStatus(w http.ResponseWriter, r *http.Request) {
	// get pool id from path
	pool_id := chi.URLParam(r, "id")

	// get pool name from pool id
	var poolName string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", pool_id)
	err := conn.QueryRow(query).Scan(&poolName)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// get scrub status
	response := subprocess.Run("sudo", "zpool", "status", poolName)

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	scan := extractScan(response.StdOut)

	// get cron job with pool id
	cronJob := CronJob{}
	query = fmt.Sprintf("SELECT * FROM CRONJOB WHERE PoolRefId = '%s' LIMIT 1", pool_id)
	err = conn.Get(&cronJob, query)

	nextRun := ""
	if err == nil {
		// get last and next run
		jobs, err := scheduler.FindJobsByTag(cronJob.Id)
		if err == nil {
			nextRun = jobs[0].NextRun().Format("2006-01-02 15:04:05")
		}
	}

	if nextRun == "0001-01-01 00:00:00" {
		nextRun = ""
	}

	// get last run from database (ZSCRUB)
	var zscrub ZScrub
	query = fmt.Sprintf("SELECT * FROM ZSCRUB WHERE PoolRefId = '%s' ORDER BY EndTime DESC LIMIT 1", pool_id)
	err = conn.Get(&zscrub, query)

	lastRun := ""
	if err == nil {
		if zscrub.EndTime != nil {
			lastRun = zscrub.EndTime.Format("2006-01-02 15:04:05")
		}
	}

	scrubStatus := ScrubStatus{}
	scrubStatus.Status = scan
	scrubStatus.LastRun = lastRun
	scrubStatus.NextRun = nextRun

	format.JSON(w, http.StatusOK, scrubStatus)
}

type ZScrub_History struct {
	Id                string     `json:"id" db:"Id"`
	PoolName          *string    `json:"pool_name" db:"PoolName"`
	Status            *string    `json:"status" db:"Status"`
	Total             *string    `json:"total" db:"Total"`
	CompletionPercent *string    `json:"completion_percent" db:"CompletionPercent"`
	ProgressTime      *string    `json:"progress_time" db:"ProgressTime"`
	Repaired          *string    `json:"repaired" db:"Repaired"`
	Errors            *string    `json:"errors" db:"Errors"`
	StartTime         *time.Time `json:"start_time" db:"StartTime"`
	EndTime           *time.Time `json:"end_time" db:"EndTime"`
	Log               *string    `json:"log" db:"Log"`
}

// @Summary Get scrub list
// @Description Get scrub list
// @Tags scrub
// @Accept  json
// @Produce  json
// @Param pool_id path string true "Pool ID"
// @Success 200 {array} ZScrub "Scrub list"
// @Router /api/storage/pools/{id}/scrub-list [get]
func getScrubHistory(w http.ResponseWriter, r *http.Request) {
	pool_id := chi.URLParam(r, "id")

	zscrubs := []ZScrub{}
	query := fmt.Sprintf("SELECT * FROM ZSCRUB WHERE PoolRefId = '%s' ORDER BY StartTime DESC", pool_id)
	err := conn.Select(&zscrubs, query)

	zscrubs_history := []ZScrub_History{}

	for i := 0; i < len(zscrubs); i++ {
		// get pool name from pool id
		var poolName string
		query = fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", pool_id)
		err = conn.QueryRow(query).Scan(&poolName)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		zscrub := ZScrub_History{}
		zscrub.Id = zscrubs[i].Id
		zscrub.PoolName = &poolName
		zscrub.Status = zscrubs[i].Status
		zscrub.Total = zscrubs[i].Total
		zscrub.CompletionPercent = zscrubs[i].CompletionPercent
		zscrub.ProgressTime = zscrubs[i].ProgressTime
		zscrub.Repaired = zscrubs[i].Repaired
		zscrub.Errors = zscrubs[i].Errors
		zscrub.StartTime = zscrubs[i].StartTime
		zscrub.EndTime = zscrubs[i].EndTime
		zscrub.Log = zscrubs[i].Log

		zscrubs_history = append(zscrubs_history, zscrub)
	}

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, zscrubs_history)
}

func extractScan(output string) string {
	startMarker := "scan: "
	pattern := `^(\w+):`
	lines := strings.Split(output, "\n")

	var statusLines []string
	foundStart := false

	for _, line := range lines {
		match, _ := regexp.MatchString(pattern, line)
		if match && foundStart {
			break
		}

		if strings.Contains(line, startMarker) {
			foundStart = true
		}

		if foundStart {
			statusLines = append(statusLines, line)
		}
	}

	if len(statusLines) == 0 {
		return ""
	}

	resultString := strings.TrimSpace(strings.Join(statusLines, "\n"))

	// remove all /n and /t
	resultString = strings.TrimSpace(resultString)
	resultString = strings.ReplaceAll(resultString, "\t", "")

	return resultString
}

func extractScrubInfo(scan string) (string, string, string, string, string, int, string, string, error) {
	// get scrub end time from scan
	// update scrub end time in database
	var endTime string
	var endTimeDate time.Time
	split := strings.Split(scan, "scan: ")
	if len(split) > 1 {
		endTime = strings.Split(scan, "scan: ")[1]
		split := strings.Split(endTime, " on ")
		if len(split) > 1 {
			endTime = split[1]
			endTimeDate, _ = time.Parse("Mon Jan 2 15:04:05 2006", endTime)
		}
	}

	date := ""
	if endTimeDate != (time.Time{}) {
		date = endTimeDate.Format("2006-01-02 15:04:05")
	}
	scanned := ""
	issued := ""
	total := ""
	repaired := ""
	errors := -1
	completionPercent := ""
	progressTime := ""

	// find scanned, issued, total, repaired, errors, completinpercent, progresstime
	// scanned: 3.00G scanned at 3.00F/s -> 3.00G
	// check if scan is more than 1 line
	lines := strings.Split(scan, "\n")
	if len(lines) > 1 {
		split := strings.Split(lines[1], " scanned")
		if len(split) > 1 {
			scanned = split[0]
			scanned = strings.TrimSpace(scanned)
		}
	}

	// issued: 0B issued at 0B/s -> 0B
	if len(lines) > 1 {
		split := strings.Split(lines[1], " issued")
		if len(split) >= 1 {
			issued = split[0]
			split = strings.Split(issued, ", ")
			if len(split) > 1 {
				issued = split[1]
				issued = strings.TrimSpace(issued)
			}
		}
	}

	// total: 3.00G total -> 3.00G
	if len(lines) > 1 {
		split := strings.Split(lines[1], " total")
		if len(split) >= 1 {
			total = split[0]
			split = strings.Split(total, ", ")
			if len(split) > 2 {
				total = split[2]
				total = strings.TrimSpace(total)
			}
		}
	}

	if len(lines) > 2 {
		split := strings.Split(lines[2], " repaired")
		if len(split) >= 1 {
			repaired = split[0]
			repaired = strings.TrimSpace(repaired)
		}
	} else if len(lines) == 1 {
		split := strings.Split(lines[0], " repaired ")
		if len(split) > 1 {
			repaired = split[1]
			split = strings.Split(repaired, " ")
			if len(split) >= 1 {
				repaired = split[0]
				repaired = strings.TrimSpace(repaired)
			}
		}
	}

	if len(lines) == 1 {
		split := strings.Split(lines[0], "with ")
		if len(split) > 1 {
			errorsString := split[1]
			split = strings.Split(errorsString, " ")
			if len(split) >= 1 {
				errorsString = split[0]
				errors, _ = strconv.Atoi(errorsString)
			}
		}
	}

	if len(lines) > 2 {
		split := strings.Split(lines[2], " done,")
		if len(split) >= 1 {
			completionPercent = split[0]
			split = strings.Split(completionPercent, ", ")
			if len(split) > 1 {
				completionPercent = split[1]
				completionPercent = strings.TrimSpace(completionPercent)
			}
		}
	}

	if len(lines) > 2 {
		split := strings.Split(lines[2], " to go")
		if len(split) >= 1 {
			progressTime = split[0]
			split = strings.Split(progressTime, ", ")
			if len(split) > 2 {
				progressTime = split[2]
				progressTime = strings.TrimSpace(progressTime)
			}
		}
	} else if len(lines) == 1 {
		split := strings.Split(lines[0], " in ")
		if len(split) > 1 {
			split = strings.Split(split[1], " ")
			if len(split) >= 1 {
				progressTime = split[0]
				progressTime = strings.TrimSpace(progressTime)
			}
		}
	}
	// fmt.Println("date: ", date)
	// fmt.Println("scanned: ", scanned)
	// fmt.Println("issued: ", issued)
	// fmt.Println("total: ", total)
	// fmt.Println("repaired: ", repaired)
	// fmt.Println("errors: ", errors)
	// fmt.Println("completionPercent: ", completionPercent)
	// fmt.Println("progressTime: ", progressTime)

	return date, scanned, issued, total, repaired, errors, completionPercent, progressTime, nil
}

func saveScrubInfoToDB(scan string, uuid string) error {
	if strings.Contains(scan, "scan: scrub in progress") {
		// update scrub status in database
		query := fmt.Sprintf("UPDATE ZSCRUB SET Status = '%s' WHERE Id = '%s'", "In Progress", uuid)
		_, err := conn.Exec(query)

		if err != nil {
			return err
		}
	} else if strings.Contains(scan, "scan: scrub repaired") {
		// update scrub status in database
		query := fmt.Sprintf("UPDATE ZSCRUB SET Status = '%s' WHERE Id = '%s'", "Finished", uuid)
		_, err := conn.Exec(query)

		if err != nil {
			return err
		}
	} else if strings.Contains(scan, "scan: scrub canceled") {
		// update scrub status in database
		query := fmt.Sprintf("UPDATE ZSCRUB SET Status = '%s' WHERE Id = '%s'", "Canceled", uuid)
		_, err := conn.Exec(query)

		if err != nil {
			return err
		}
	}

	// get scrub end time from scan
	// update scrub end time in database
	endTime, scanned, issued, total, repaired, errors, completionPercent, progressTime, err := extractScrubInfo(scan)

	if err != nil {
		return err
	}

	fmt.Println("endTime: ", endTime)

	if endTime != "" && endTime != "0001-01-01 00:00:00" {
		query := fmt.Sprintf("UPDATE ZSCRUB SET EndTime = '%s' WHERE Id = '%s'", endTime, uuid)
		_, err = conn.Exec(query)

		if err != nil {
			return err
		}
	}

	if scanned != "" {
		query := fmt.Sprintf("UPDATE ZSCRUB SET Scanned = '%s' WHERE Id = '%s'", scanned, uuid)
		conn.Exec(query)
	}

	if issued != "" {
		query := fmt.Sprintf("UPDATE ZSCRUB SET Issued = '%s' WHERE Id = '%s'", issued, uuid)
		conn.Exec(query)
	}

	if total != "" {
		query := fmt.Sprintf("UPDATE ZSCRUB SET Total = '%s' WHERE Id = '%s'", total, uuid)
		conn.Exec(query)
	}

	if repaired != "" {
		query := fmt.Sprintf("UPDATE ZSCRUB SET Repaired = '%s' WHERE Id = '%s'", repaired, uuid)
		conn.Exec(query)
	}

	if errors != -1 {
		query := fmt.Sprintf("UPDATE ZSCRUB SET Errors = '%d' WHERE Id = '%s'", errors, uuid)
		conn.Exec(query)
	}

	if completionPercent != "" {
		query := fmt.Sprintf("UPDATE ZSCRUB SET CompletionPercent = '%s' WHERE Id = '%s'", completionPercent, uuid)
		conn.Exec(query)
	}

	if progressTime != "" {
		query := fmt.Sprintf("UPDATE ZSCRUB SET ProgressTime = '%s' WHERE Id = '%s'", progressTime, uuid)
		conn.Exec(query)
	}

	// update scrub log in database
	query := fmt.Sprintf("UPDATE ZSCRUB SET Log = '%s' WHERE Id = '%s'", scan, uuid)
	conn.Exec(query)

	return nil
}

// @Summary Cancel scrub by pool id
// @Description cancel scrub by pool id
// @Tags scrub
// @Accept  json
// @Produce  json
// @Param id path string true "Pool Id"
// @Success 200 {string} string "Scrub canceled"
// @Router /api/storage/pools/{id}/scrub [delete]
func cancelScrub(w http.ResponseWriter, r *http.Request) {
	pool_id := chi.URLParam(r, "id")

	// get pool name from pool id
	var poolName string
	query := fmt.Sprintf("SELECT Name FROM ZPOOLS WHERE Id = '%s'", pool_id)
	err := conn.QueryRow(query).Scan(&poolName)

	logVariables := LogVariables{
		ObjectName: poolName,
	}

	if err != nil {
		ZScrubLogMessage(LogPriority.Error, zScrubLogMessageId.ZScrubStopFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// stop scrub
	response := subprocess.Run("sudo", "zpool", "scrub", "-s", poolName)
	if response.ExitCode != 0 {
		ZScrubLogMessage(LogPriority.Error, zScrubLogMessageId.ZScrubStopFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	ZScrubLogMessage(LogPriority.Info, zScrubLogMessageId.ZScrubStop, logVariables)

	format.JSON(w, http.StatusOK, "Scrub canceled")
}

// @Summary Remove scrub record by scrub id
// @Description remove scrub record by scrub id
// @Tags scrub
// @Accept  json
// @Produce  json
// @Param id path string true "Scrub Id"
// @Success 200 {string} string "Scrub record removed"
// @Router /api/storage/scrubs/{id} [delete]
func removeScrubRecord(w http.ResponseWriter, r *http.Request) {
	scrub_id := chi.URLParam(r, "id")

	// remove scrub record
	query := fmt.Sprintf("DELETE FROM ZSCRUB WHERE Id = '%s'", scrub_id)
	_, err := conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, "Scrub record removed")
}

// @Summary Start scrub by pool id
// @Description start scrub by pool id
// @Tags scrub
// @Accept  json
// @Produce  json
// @Param id path string true "Pool Id"
// @Success 200 {string} string "Scrub started"
// @Router /api/storage/pools/{id}/scrub-once [post]
func scrubNow(w http.ResponseWriter, r *http.Request) {
	pool_id := chi.URLParam(r, "id")

	err := scrubPool(pool_id)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, "Scrub started")
}
