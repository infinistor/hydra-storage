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
	"fmt"
	"net/http"
	"time"
)

// @Summary Get Notifications
// @Description Get Notifications
// @Tags notifications
// @Accept  json
// @Produce  json
// @Param limit query string false "Limit"
// @Success 200 {object} Log
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/notifications [get]
func getNotifications(w http.ResponseWriter, r *http.Request) {
	// get parameter limit
	limit := r.URL.Query().Get("limit")

	if limit == "" {
		limit = "10"
	}
	// select syslogs
	query := fmt.Sprintf("SELECT Priority, Message, SysLogTag, DeviceReportedTime, FromHost FROM SystemEvents WHERE DeviceReportedTime >= '%s 00:00:00' AND Message LIKE '%%[%s]%%' ORDER BY DeviceReportedTime DESC LIMIT %s", time.Now().Format("2006-01-02"), LogProcessName, limit)

	data := make([]Log, 0)
	err := connSys.Select(&data, query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	format.JSON(w, http.StatusOK, data)
}
