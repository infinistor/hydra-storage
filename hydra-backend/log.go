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
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi"
	"gopkg.in/pygz/subprocess.v1"
)

// swagger:model
type Log struct {
	Priority           int       `json:"priority" db:"Priority"`
	Message            string    `json:"message" db:"Message"`
	SysLogTag          string    `json:"syslogtag" db:"SysLogTag"`
	DeviceReportedTime time.Time `json:"devicereportedtime" db:"DeviceReportedTime"`
	FromHost           string    `json:"fromhost" db:"FromHost"`
}

// @Summary List logs
// @Description List logs
// @Tags syslog
// @Accept  json
// @Produce  json
// @Param start_date query string true "start_date" default(2023-03-29)
// @Param end_date query string true "end_date" default(2023-03-29)
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/syslog/list [get]
func listLogs(w http.ResponseWriter, r *http.Request) {
	// get start and end date from params
	start_date := r.URL.Query().Get("start_date")
	end_date := r.URL.Query().Get("end_date")
	query := fmt.Sprintf("SELECT Priority, Message, SysLogTag, DeviceReportedTime, FromHost FROM SystemEvents WHERE DeviceReportedTime >= '%s 00:00:00' AND DeviceReportedTime <= '%s 23:59:59' ORDER BY FromHost ASC, SysLogTag ASC, DeviceReportedTime ASC", start_date, end_date)
	data := make([]Log, 0)
	err := connSys.Select(&data, query)
	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	format.JSON(w, http.StatusOK, data)
}

// @Summary List hydra logs only
// @Description List hydra logs only
// @Tags syslog
// @Accept  json
// @Produce  json
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/hydralog [get]
func listHydraLogs(w http.ResponseWriter, r *http.Request) {
	// get pos from params
	start := r.URL.Query().Get("start")
	// get count from params
	count := r.URL.Query().Get("count")

	if start == "" {
		start = "0"
	}
	if count == "" {
		count = "50"
	}
	// get filter[priority] from params
	priority := r.URL.Query().Get("filter[priority]")
	priorityList := strings.Split(priority, ",")
	// get filter[message] from params
	message := r.URL.Query().Get("filter[message]")
	// get filter[devicereportedtime] from params
	// ex. {"start":"2023-07-04 00:00:00","end":"2023-07-05 00:00:00"}
	devicereportedtime := r.URL.Query().Get("filter[devicereportedtime]")
	// check if devicereportedtime is not in query string
	// change json to map
	var start_date string
	var end_date string
	if devicereportedtime != "" {
		var reportedtime map[string]string
		err := json.Unmarshal([]byte(devicereportedtime), &reportedtime)
		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}
		start_date = reportedtime["start"]
		end_date = reportedtime["end"]
	} else {
		// set start_date and end_date to today
		start_date = time.Now().Format("2006-01-02")
		end_date = time.Now().Format("2006-01-02")
	}

	var params []string
	if priority != "" {
		params = append(params, fmt.Sprintf("Priority IN (%s)", strings.Join(priorityList, ",")))
	}
	if message != "" {
		params = append(params, fmt.Sprintf("Message LIKE '%%%s%%'", message))
	}
	if start_date != "" && end_date != "" {
		// change to 2023-07-04 00:00:00
		start_date = fmt.Sprintf("%s 00:00:00", start_date[:10])
		// change 2023-07-05 00:00:00 to 2023-07-05 23:59:59
		end_date = fmt.Sprintf("%s 23:59:59", end_date[:10])

		params = append(params, fmt.Sprintf("DeviceReportedTime >= '%s' AND DeviceReportedTime <= '%s'", start_date, end_date))
	}

	// select current hostname
	var hostname string
	response := subprocess.Run("hostname")
	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	} else {
		hostname = strings.ReplaceAll(response.StdOut, "\n", "")
	}

	// add logs to the following json
	// "pos": start, "total_count": total_count, "data": logs
	var query string
	var total_count int
	if len(params) == 0 {
		query = fmt.Sprintf("SELECT COUNT(*) FROM SystemEvents WHERE FromHost = '%s' AND Message LIKE '[%s]%%'", hostname, LogProcessName)
	} else {
		query = fmt.Sprintf("SELECT COUNT(*) FROM SystemEvents WHERE FromHost = '%s' AND %s AND Message LIKE '[%s]%%'", hostname, strings.Join(params, " AND "), LogProcessName)
	}
	err := connSys.Get(&total_count, query)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// in order to get logs by devicedeportedtime desc, we need to calculate the offset
	start_int, err := strconv.Atoi(start)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	limit, err := strconv.Atoi(count)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	offset := total_count - start_int - limit
	if offset < 0 {
		offset = 0
		limit = total_count - start_int
	}
	// get all ID of logs (for better performance)
	if len(params) == 0 {
		query = fmt.Sprintf("SELECT ID FROM SystemEvents WHERE FromHost = '%s' AND Message LIKE '[%s]%%' LIMIT %d OFFSET %d", hostname, LogProcessName, limit, offset)
	} else {
		query = fmt.Sprintf("SELECT ID FROM SystemEvents WHERE FromHost = '%s' AND %s AND Message LIKE '[%s]%%' LIMIT %d OFFSET %d", hostname, strings.Join(params, " AND "), LogProcessName, limit, offset)
	}

	var ids []int
	err = connSys.Select(&ids, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// get all logs by ID
	logs := make([]Log, 0)

	if len(ids) == 0 {
		data := map[string]interface{}{
			"pos":         start,
			"total_count": total_count,
			"data":        logs,
		}

		format.JSON(w, http.StatusOK, data)
		return
	}

	query = fmt.Sprintf("SELECT Priority, Message, SysLogTag, DeviceReportedTime, FromHost FROM SystemEvents WHERE ID IN (%s) ORDER BY DeviceReportedTime DESC", strings.Trim(strings.Join(strings.Fields(fmt.Sprint(ids)), ","), "[]"))

	err = connSys.Select(&logs, query)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// build map
	data := map[string]interface{}{
		"pos":         start,
		"total_count": total_count,
		"data":        logs,
	}

	format.JSON(w, http.StatusOK, data)
}

// @Summary List logs by hostname
// @Description List logs by hostname
// @Tags syslog
// @Accept  json
// @Produce  json
// @Param hostname path string true "hostname" default(osd1)
// @Param start_date query string true "start_date" default(2023-03-29)
// @Param end_date query string true "end_date" default(2023-03-29)
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/syslog/list/{hostname} [get]
func listLogsByHostName(w http.ResponseWriter, r *http.Request) {
	hostname := chi.URLParam(r, "hostname")
	// get start and end date from params
	start_date := r.URL.Query().Get("start_date")
	end_date := r.URL.Query().Get("end_date")
	query := fmt.Sprintf("SELECT Priority, Message, SysLogTag, DeviceReportedTime, FromHost FROM SystemEvents WHERE FromHost = '%s' AND DeviceReportedTime >= '%s 00:00:00' AND DeviceReportedTime <= '%s 23:59:59' ORDER BY SysLogTag ASC, DeviceReportedTime ASC", hostname, start_date, end_date)
	data := make([]Log, 0)
	err := connSys.Select(&data, query)
	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	format.JSON(w, http.StatusOK, data)
}

// @Summary List all hosts
// @Description List all hosts
// @Tags syslog
// @Produce  json
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/syslog/list/hosts [get]
func listAllHosts(w http.ResponseWriter, r *http.Request) {
	query := fmt.Sprintf("SELECT DISTINCT FromHost FROM SystemEvents")
	data := make([]string, 0)
	err := connSys.Select(&data, query)
	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	format.JSON(w, http.StatusOK, data)
}
