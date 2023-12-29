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
	"math/rand"
	"net/http"
	"time"

	"github.com/go-chi/chi"
)

const (
	ACCESS_KEY_LENGTH = 20
	SECRET_KEY_LENGTH = 40
)

var (
	TEXT        = []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
	TEXT_STRING = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
)

// RandomText generates a random string of uppercase letters and numbers of length `Length`.
func RandomText(Length int) string {
	rand.Seed(time.Now().UnixNano())
	chars := make([]rune, Length)
	for i := range chars {
		chars[i] = TEXT[rand.Intn(len(TEXT))]
	}
	return string(chars)
}

// RandomTextLong generates a random string of uppercase letters, lowercase letters, and numbers of length `Length`.
func RandomTextLong(Length int) string {
	rand.Seed(time.Now().UnixNano())
	chars := make([]rune, Length)
	for i := range chars {
		chars[i] = TEXT_STRING[rand.Intn(len(TEXT_STRING))]
	}
	return string(chars)
}

// CreateAccessKey generates a random access key of length `ACCESS_KEY_LENGTH`.
func CreateAccessKey() string {
	return RandomText(ACCESS_KEY_LENGTH)
}

// CreateSecretKey generates a random secret key of length `SECRET_KEY_LENGTH`.
func CreateSecretKey() string {
	return RandomTextLong(SECRET_KEY_LENGTH)
}

// swagger:model
type S3Credentials struct {
	AccessKey string `json:"access_key"`
	SecretKey string `json:"secret_key"`
}

// @Summary Generate S3 Credentials
// @Description Generate S3 Credentials
// @Produce  json
// @Tags user
// @Success 200 {object} S3Credentials
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/users/s3-credentials [get]
func generateS3Credentials(w http.ResponseWriter, r *http.Request) {
	access_key := CreateAccessKey()
	secret_key := CreateSecretKey()
	var s3_credentials S3Credentials = S3Credentials{AccessKey: access_key, SecretKey: secret_key}
	format.JSON(w, http.StatusOK, s3_credentials)
	return
}

// @Summary List S3 Credentials for User
// @Description List S3 Credentials for User
// @Produce  json
// @Tags user
// @Param id path string true "User ID"
// @Success 200 {array} S3Credentials
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/users/{id}/s3-credentials [get]
func listS3CredentialsForUser(w http.ResponseWriter, r *http.Request) {
	// get user id from url
	id := chi.URLParam(r, "id")

	// get S3 credentials from database
	query := fmt.Sprintf("SELECT AccessKey, SecretKey FROM USER_S3CREDENTIAL WHERE UserRefId = '%s'", id)
	rows, err := conn.Query(query)
	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// create array of S3 credentials
	s3_credentials := []S3Credentials{}
	for rows.Next() {
		// get S3 credentials from database
		s3credential := S3Credentials{}
		err = rows.Scan(&s3credential.AccessKey, &s3credential.SecretKey)
		if err != nil {
			format.JSON(w, http.StatusBadRequest, err.Error())
			return
		}

		// // decrypt S3 credentials
		// s3credential.AccessKey = decryptString(s3credential.AccessKey)
		// s3credential.SecretKey = decryptString(s3credential.SecretKey)

		// add S3 credentials to array
		s3_credentials = append(s3_credentials, s3credential)
	}

	format.JSON(w, http.StatusOK, s3_credentials)
	return
}

// @Summary Delete S3 Credentials for User
// @Description Delete S3 Credentials for User
// @Accept  json
// @Produce  json
// @Tags user
// @Param id path string true "User ID"
// @Param body body S3Credentials true "S3 Credentials"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/users/{id}/s3-credentials [delete]
func deleteS3CredentialForUser(w http.ResponseWriter, r *http.Request) {
	// get user id from url
	id := chi.URLParam(r, "id")

	// get S3 credentials from body
	s3credentials := S3Credentials{}
	err := json.NewDecoder(r.Body).Decode(&s3credentials)
	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// select user id from database
	query := fmt.Sprintf("SELECT UserId FROM USERS WHERE Id = '%s'", id)
	var user_id string
	err = conn.QueryRow(query).Scan(&user_id)

	var logVariables = LogVariables{
		UserName:   "admin",
		ObjectName: user_id,
	}

	// delete S3 credentials from database
	query = fmt.Sprintf("DELETE FROM USER_S3CREDENTIAL WHERE UserRefId = '%s' AND AccessKey = '%s' AND SecretKey = '%s'", id, s3credentials.AccessKey, s3credentials.SecretKey)
	_, err = conn.Exec(query)
	if err != nil {

		UserLogMessage(LogPriority.Error, userLogMessageId.S3CredentialsDeleteFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	UserLogMessage(LogPriority.Info, userLogMessageId.S3CredentialsDelete, logVariables)

	format.JSON(w, http.StatusOK, "S3 Credentials Deleted")
	return
}

// @Summary Create S3 Credentials for User
// @Description Create S3 Credentials for User
// @Accept  json
// @Produce  json
// @Tags user
// @Param id path string true "User ID"
// @Param body body S3Credentials true "S3 Credentials"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/users/{id}/s3-credentials [post]
func createS3CredentialsForUser(w http.ResponseWriter, r *http.Request) {
	// get user id from url
	id := chi.URLParam(r, "id")
	// get S3 credentials from body
	s3credentials := S3Credentials{}
	err := json.NewDecoder(r.Body).Decode(&s3credentials)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
		return
	}

	// select user id from database
	query := fmt.Sprintf("SELECT UserId FROM USERS WHERE Id = '%s'", id)
	var user_id string
	err = conn.QueryRow(query).Scan(&user_id)

	var logVariables = LogVariables{
		UserName:   "admin",
		ObjectName: user_id,
	}

	// encrypt S3 credentials
	// s3credentials.AccessKey = encryptString(s3credentials.AccessKey)
	// s3credentials.SecretKey = encryptString(s3credentials.SecretKey)

	// insert S3 credentials into database
	query = fmt.Sprintf("INSERT INTO USER_S3CREDENTIAL(UserRefId, AccessKey, SecretKey, UpdateDate) VALUES ('%s', '%s', '%s', '%s')", id, s3credentials.AccessKey, s3credentials.SecretKey, time.Now().Format("2006-01-02 15:04:05"))
	_, err = conn.Exec(query)
	if err != nil {
		UserLogMessage(LogPriority.Error, userLogMessageId.S3CredentialsCreateFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	UserLogMessage(LogPriority.Info, userLogMessageId.S3CredentialsCreate, logVariables)

	format.JSON(w, http.StatusOK, "S3 Credentials Created")
	return
}
