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
	"time"

	"github.com/go-chi/chi"
)

// swagger:model
type ChapUser struct {
	Id                 string    `json:"id" db:"Id"`
	ChapName           string    `json:"chap_name" db:"ChapName"`
	Password           string    `json:"password" db:"Password"`
	PasswordChangeDate string    `json:"password_change_date" db:"PasswordChangeDate"`
	UpdateDate         time.Time `json:"update_date" db:"UpdateDate"`
}

// @Summary Get Chap Users
// @Description Get Chap Users
// @Tags chap_user
// @Produce  json
// @Success 200 {array} ChapUser
// @Failure 500 {object} Response
// @Router /api/chap-users [get]
func getChapUserList(w http.ResponseWriter, r *http.Request) {
	chapUsers := []ChapUser{}
	err := conn.Select(&chapUsers, "SELECT * FROM CHAP_USERS")
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
	}
	// decrypt chap user password
	for i := 0; i < len(chapUsers); i++ {
		chapUsers[i].Password = decryptString(chapUsers[i].Password)
	}

	format.JSON(w, http.StatusOK, chapUsers)
}

// @Summary Get Chap User
// @Description Get Chap User
// @Tags chap_user
// @Produce  json
// @Param id path string true "Chap User ID"
// @Success 200 {object} ChapUser
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/chap-users/{id} [get]
func getChapUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	chapUser := ChapUser{}
	err := conn.Get(&chapUser, "SELECT * FROM CHAP_USERS WHERE Id = ?", id)
	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
	}
	format.JSON(w, http.StatusOK, chapUser)
}

type ChapUserPost struct {
	ChapName string `json:"chap_name" example:"dev1-user1"`
	Password string `json:"password" example:"password123456"`
}

// @Summary Create Chap User
// @Description Create Chap User
// @Tags chap_user
// @Accept  json
// @Produce  json
// @Param body body ChapUserPost true "Chap User"
// @Success 200 {string} string "Chap User Created"
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/chap-users [post]
func addChapUser(w http.ResponseWriter, r *http.Request) {
	chapUser := ChapUserPost{}
	err := json.NewDecoder(r.Body).Decode(&chapUser)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to create CHAP user '%s'", LogProcessName, "admin", chapUser.ChapName)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: chapUser.ChapName,
	}

	chapUser.Password = encryptString(chapUser.Password)

	query := fmt.Sprintf("INSERT INTO CHAP_USERS (ChapName, Password, PasswordChangeDate, UpdateDate) VALUES ('%s', '%s', '%s', '%s')",
		chapUser.ChapName, chapUser.Password, time.Now().Format("2006-01-02 15:04:05"), time.Now().Format("2006-01-02 15:04:05"))
	_, err = conn.Exec(query)
	if err != nil {
		ChapUserLogMessage(LogPriority.Error, chapUserLogMessageId.ChapUserCreateFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	ChapUserLogMessage(LogPriority.Info, chapUserLogMessageId.ChapUserCreate, logVariables)

	format.JSON(w, http.StatusOK, "Chap User Created")
}

// @Summary Edit Chap User
// @Description Edit Chap User
// @Tags chap_user
// @Accept  json
// @Produce  json
// @Param id path string true "Chap User ID"
// @Param body body string true "Chap User"
// @Success 200 {string} string "Chap User Deleted"
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/chap-users/{id} [put]
func editChapUserPassword(w http.ResponseWriter, r *http.Request) {
	// chap user id from url
	id := chi.URLParam(r, "id")
	// password string from body
	var password string
	err := json.NewDecoder(r.Body).Decode(&password)
	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	password = encryptString(password)

	// select chap name from database
	var chap_name string
	query := fmt.Sprintf("SELECT ChapName FROM CHAP_USERS WHERE Id = '%s'", id)
	err = conn.QueryRow(query).Scan(&chap_name)

	RequestLog := fmt.Sprintf("[%s] %s requested to modify CHAP user '%s'", LogProcessName, "admin", chap_name)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: chap_name,
	}

	// update chap user password
	query = fmt.Sprintf("UPDATE CHAP_USERS SET Password = '%s', PasswordChangeDate = '%s', UpdateDate = '%s' WHERE Id = '%s'",
		password, time.Now().Format("2006-01-02 15:04:05"), time.Now().Format("2006-01-02 15:04:05"), id)
	_, err = conn.Exec(query)
	if err != nil {
		ChapUserLogMessage(LogPriority.Error, chapUserLogMessageId.ChapUserUpdateFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	ChapUserLogMessage(LogPriority.Info, chapUserLogMessageId.ChapUserUpdate, logVariables)

	format.JSON(w, http.StatusOK, "Chap User Password Updated")
}

// @Summary Delete Chap User
// @Description Delete Chap User
// @Tags chap_user
// @Produce  json
// @Param id path string true "Chap User ID"
// @Success 200 {string} string "Chap User Deleted"
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/chap-users/{id} [delete]
func deleteChapUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// select chap name from database
	var chap_name string
	query := fmt.Sprintf("SELECT ChapName FROM CHAP_USERS WHERE Id = '%s'", id)
	err := conn.QueryRow(query).Scan(&chap_name)

	RequestLog := fmt.Sprintf("[%s] %s requested to delete CHAP user '%s'", LogProcessName, "admin", chap_name)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: chap_name,
	}

	query = fmt.Sprintf("DELETE FROM CHAP_USERS WHERE Id = '%s'", id)
	_, err = conn.Exec(query)
	if err != nil {
		ChapUserLogMessage(LogPriority.Error, chapUserLogMessageId.ChapUserDeleteFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	ChapUserLogMessage(LogPriority.Info, chapUserLogMessageId.ChapUserDelete, logVariables)

	format.JSON(w, http.StatusOK, "Chap User Deleted")
}

// @Summary Check if a chap user exists
// @Description Check if a chap user exists
// @Tags chap_user
// @Produce  json
// @Param chapUserId path string true "Chap User ID"
// @Success 200 {string} bool "Chap User Exists"
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/chap-users/chap-user-id-taken/{chapUserId} [get]
func chapUserIdTaken(w http.ResponseWriter, r *http.Request) {
	chapUserId := chi.URLParam(r, "chapUserId")
	chapUser := ChapUser{}

	query := fmt.Sprintf("SELECT * FROM CHAP_USERS WHERE ChapName = '%s'", chapUserId)
	err := conn.Get(&chapUser, query)

	if err != nil {
		format.JSON(w, http.StatusOK, false)
		return
	} else {
		format.JSON(w, http.StatusOK, true)
		return
	}

}
