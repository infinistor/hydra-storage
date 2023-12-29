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
	"io/ioutil"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/twinj/uuid"
)

func tokenToDB(userid int, td *TokenDetails) error {
	query := fmt.Sprintf("INSERT INTO tokens (user_id, access_token, refresh_token, access_uuid, refresh_uuid, at_expires, rt_expires) values ('%d', '%s', '%s' , '%s', '%s', '%d', '%d')", userid, td.AccessToken, td.RefreshToken, td.AccessUuid, td.RefreshUuid, td.AtExpires, td.RtExpires)
	_, err := conn.Exec(query)
	if err != nil {
		return err
	}
	return nil
}

func extractToken(r *http.Request) string {
	bearToken := r.Header.Get("Authorization")
	strArr := strings.Split(bearToken, " ")
	if len(strArr) == 2 {
		return strArr[1]
	}
	return ""
}

func verifyToken(r *http.Request) (*jwt.Token, error) {
	tokenString := extractToken(r)
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		//Make sure that the token method conform to "SigningMethodHMAC"
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("there was an error")
		}
		return []byte(os.Getenv("ACCESS_SECRET")), nil
	})
	if err != nil {
		return nil, err
	}
	return token, nil
}

func tokenValid(r *http.Request) error {
	token, err := verifyToken(r)
	if err != nil {
		return err
	}
	if _, ok := token.Claims.(jwt.Claims); !ok && !token.Valid {
		return err
	}
	return nil
}

func extractTokenMetadata(r *http.Request) (*AccessDetails, error) {
	token, err := verifyToken(r)
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)

	if ok && token.Valid {
		accessUuid, ok := claims["access_uuid"].(string)

		if !ok {
			return nil, err
		}
		userId, err := strconv.ParseUint(fmt.Sprintf("%.f", claims["user_id"]), 10, 64)
		if err != nil {

			return nil, err
		}

		return &AccessDetails{
			AccessUuid: accessUuid,
			UserId:     userId,
		}, nil
	}
	return nil, err
}

func fetchAuth(authD *AccessDetails) (uint64, error) {
	var userId uint64
	now := time.Now().Unix()

	query := fmt.Sprintf("SELECT user_id FROM tokens WHERE access_uuid='%s' AND at_expires > '%d'", authD.AccessUuid, now)

	err := conn.QueryRow(query).Scan(&userId)
	if err != nil {
		return 0, err
	}
	return userId, nil
}

func deleteAuth(givenUuid string) (int64, error) {
	query := fmt.Sprintf("DELETE FROM tokens WHERE access_uuid='%s' OR refresh_uuid='%s'", givenUuid, givenUuid)
	res, err := conn.Exec(query)
	if err != nil {
		return 0, err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return 0, err
	}
	return rows, nil
}

func tokenAuthMiddleWare(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		err := tokenValid(r)
		if err != nil {
			format.Text(w, 401, "unauthorized")
			return
		}
		next(w, r)
	})
}

type AdminUserInfo struct {
	Id        int     `json:"id" db:"Id"`
	Username  string  `json:"username" db:"Username"`
	Password  string  `json:"password" db:"Password"`
	GrafanaIP *string `json:"grafana_ip,omitempty" db:"GrafanaIP"`
}

// @Summary Login
// @Description Login
// @Tags auth
// @Accept  json
// @Produce  json
// @Param Body body User true "username and password"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/login [post]
func login(w http.ResponseWriter, r *http.Request) {
	body, err_body := ioutil.ReadAll(r.Body)

	if err_body != nil {
		format.Text(w, 500, err_body.Error())
		return
	}

	var u User
	err := json.Unmarshal([]byte(body), &u)

	if err != nil {
		format.Text(w, http.StatusBadRequest, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] user '%s' requested to log in", LogProcessName, u.Username)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: u.Username,
	}

	// encrypt password
	u.Password = encryptString(u.Password)

	// get user from db (ADMIN_LOGIN_INFO)
	var user AdminUserInfo
	err = conn.Get(&user, fmt.Sprintf("SELECT * FROM ADMIN_LOGIN_INFO WHERE Username = '%s' AND Password = '%s'", u.Username, u.Password))
	if err != nil {
		LoginLogMessage(LogPriority.Error, loginLogMessageId.LoginFail, logVariables)
		// if user not found
		format.JSON(w, http.StatusUnauthorized, "Please provide valid login details")
		return
	}

	token, err := createToken(user.Id)
	if err != nil {
		LoginLogMessage(LogPriority.Error, loginLogMessageId.LoginFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// check if there is an entry in SYSTEM_MNG_NET_INTERFACE
	query := "SELECT COUNT(*) FROM SYSTEM_MNG_NET_INTERFACE"
	var count int
	conn.QueryRow(query).Scan(&count)
	managementNetworkExists := false
	if count > 0 {
		managementNetworkExists = true
	}

	tokens := map[string]string{
		"access_token":              token.AccessToken,
		"refresh_token":             token.RefreshToken,
		"management_network_exists": strconv.FormatBool(managementNetworkExists),
	}

	LoginLogMessage(LogPriority.Info, loginLogMessageId.LoginSuccess, logVariables)

	format.JSON(w, http.StatusOK, tokens)
}

// @Summary Logout
// @Description Logout
// @Tags auth
// @Accept  json
// @Produce  json
// @Authorization Bearer {token}
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/logout [post]
func logout(w http.ResponseWriter, r *http.Request) {
	metadata, err := extractTokenMetadata(r)
	if err != nil {
		format.Text(w, 401, "unauthorized")
		return
	}

	deleted, delErr := deleteAuth(metadata.AccessUuid)
	if delErr != nil || deleted == 0 {
		format.Text(w, 401, "unauthorized")
		return
	}

	format.Text(w, 200, "Successfully logged out")
}

func createTodo(w http.ResponseWriter, r *http.Request) {
	body, err_body := ioutil.ReadAll(r.Body)

	if err_body != nil {
		format.Text(w, 500, err_body.Error())
		return
	}

	var todo ToDo
	json.Unmarshal([]byte(body), &todo)

	tokenAuth, err := extractTokenMetadata(r)
	if err != nil {
		format.Text(w, 401, "unauthorized")
		return
	}

	userId, err := fetchAuth(tokenAuth)
	if err != nil {
		format.Text(w, 401, "unauthorized")
		return
	}

	todo.UserID = int(userId)

	format.JSON(w, 200, todo)
}

// swagger:model
type RefreshToken struct {
	// refresh token
	RefreshToken string `json:"refresh_token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2Nzg4NzQyNjIsInJlZnJlc2hfdXVpZCI6IjAxODQyMzlhLWRmNGMtNDc2NC05YzIxLTIxNzBjZmMxNWMyNCIsInVzZXJfaWQiOjF9.BDcAKqXzvKJiNyCGellT0JnMdUlp0OiySfQ6vUxg09A"`
}

// @Summary Refresh token
// @Description Refresh token
// @Tags auth
// @Authorization Bearer {token}
// @Accept  json
// @Produce  json
// @Param Body body RefreshToken true "refresh token"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/refresh [post]
func refreshToken(w http.ResponseWriter, r *http.Request) {
	mapToken := map[string]string{}

	err := json.NewDecoder(r.Body).Decode(&mapToken)
	if err != nil {
		format.JSON(w, http.StatusUnprocessableEntity, err.Error())
		return
	}
	refreshToken := mapToken["refresh_token"]

	//verify the token
	token, err := jwt.Parse(refreshToken, func(token *jwt.Token) (interface{}, error) {
		//Make sure that the token method conform to "SigningMethodHMAC"
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(os.Getenv("REFRESH_SECRET")), nil
	})
	//if there is an error, the token must have expired
	if err != nil {
		format.JSON(w, http.StatusUnauthorized, err.Error())
		return
	}
	//is token valid?
	if _, ok := token.Claims.(jwt.Claims); !ok && !token.Valid {
		format.JSON(w, http.StatusUnauthorized, err.Error())
		return
	}
	//Since token is valid, get the uuid:
	claims, ok := token.Claims.(jwt.MapClaims) //the token claims should conform to MapClaims
	if ok && token.Valid {
		refreshUuid, ok := claims["refresh_uuid"].(string) //convert the interface to string
		if !ok {
			format.JSON(w, http.StatusUnauthorized, err.Error())
			return
		}
		userId, err := strconv.ParseUint(fmt.Sprintf("%.f", claims["user_id"]), 10, 64)
		if err != nil {
			format.JSON(w, http.StatusUnauthorized, err.Error())
			return
		}
		//Delete the previous Refresh Token
		deleted, delErr := deleteAuth(refreshUuid)
		if delErr != nil || deleted == 0 { //if anything goes wrong
			format.JSON(w, http.StatusUnauthorized, err.Error())
			return
		}
		//Create new pairs of refresh and access tokens
		ts, createErr := createToken(int(userId))
		if createErr != nil {
			format.JSON(w, http.StatusUnauthorized, err.Error())
			return
		}

		tokens := map[string]string{
			"access_token":  ts.AccessToken,
			"refresh_token": ts.RefreshToken,
		}
		format.JSON(w, http.StatusCreated, tokens)
	} else {
		format.JSON(w, http.StatusUnauthorized, "Tokens expired")
	}
}

func createToken(userid int) (*TokenDetails, error) {
	td := &TokenDetails{}
	td.AtExpires = time.Now().Add(time.Minute * 15).Unix()
	td.AccessUuid = uuid.NewV4().String()

	td.RtExpires = time.Now().Add(time.Hour * 24 * 7).Unix()
	td.RefreshUuid = uuid.NewV4().String()

	var err error
	//Creating Access Token
	atClaims := jwt.MapClaims{}
	atClaims["authorized"] = true
	atClaims["access_uuid"] = td.AccessUuid
	atClaims["user_id"] = userid
	atClaims["exp"] = td.AtExpires
	at := jwt.NewWithClaims(jwt.SigningMethodHS256, atClaims)
	td.AccessToken, err = at.SignedString([]byte(os.Getenv("ACCESS_SECRET")))
	if err != nil {
		return nil, err
	}
	//Creating Refresh Token
	rtClaims := jwt.MapClaims{}
	rtClaims["refresh_uuid"] = td.RefreshUuid
	rtClaims["user_id"] = userid
	rtClaims["exp"] = td.RtExpires
	rt := jwt.NewWithClaims(jwt.SigningMethodHS256, rtClaims)
	td.RefreshToken, err = rt.SignedString([]byte(os.Getenv("REFRESH_SECRET")))
	if err != nil {
		return nil, err
	}

	//Saving tokens to database
	err = tokenToDB(userid, td)
	if err != nil {
		return nil, err
	}

	return td, nil
}

type PasswordChange struct {
	OldPassword *string `json:"old_password,omitempty" example:"123456"`
	NewPassword *string `json:"new_password,omitempty" example:"123456"`
	GrafanaIP   *string `json:"grafana_ip,omitempty" example:"http://192.168.1.100/grafana"`
}

// @Summary Change password
// @Description Change password
// @Tags auth
// @Accept json
// @Produce json
// @Param Body body PasswordChange true "new password"
// @Success 200 {string} string "Password changed successfully"
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/change-password [post]
func changePassword(w http.ResponseWriter, r *http.Request) {
	var passwordChange PasswordChange
	err := json.NewDecoder(r.Body).Decode(&passwordChange)
	if err != nil {
		format.JSON(w, http.StatusUnprocessableEntity, err.Error())
		return
	}

	if passwordChange.OldPassword != nil || passwordChange.NewPassword != nil {
		// check old password
		query := fmt.Sprintf("SELECT Password FROM ADMIN_LOGIN_INFO WHERE Username = '%s'", "admin")
		row := conn.QueryRow(query)

		var password string
		err = row.Scan(&password)
		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		password = decryptString(password)

		if *passwordChange.OldPassword != password {
			format.JSON(w, http.StatusBadRequest, "Old password is incorrect")
			return
		}

		*passwordChange.NewPassword = encryptString(*passwordChange.NewPassword)
		// change password in db
		query = fmt.Sprintf("UPDATE ADMIN_LOGIN_INFO SET Password = '%s' WHERE Username = '%s'", *passwordChange.NewPassword, "admin")
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		format.JSON(w, http.StatusOK, "Password changed successfully")
	}

	if passwordChange.GrafanaIP != nil {
		// change grafana id
		query := fmt.Sprintf("UPDATE ADMIN_LOGIN_INFO SET GrafanaIP = '%s' WHERE Username = '%s'", *passwordChange.GrafanaIP, "admin")
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
			return
		}

		format.JSON(w, http.StatusOK, "Grafana IP address saved successfully")
	}

	if passwordChange.OldPassword == nil && passwordChange.NewPassword == nil && passwordChange.GrafanaIP == nil {
		format.JSON(w, http.StatusBadRequest, "Please provide valid data")
		return
	}
}
