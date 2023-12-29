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
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"strings"
	"time"

	"github.com/go-chi/chi"
	"gopkg.in/pygz/subprocess.v1"
)

// swagger:model
type User_ struct {
	Id                 string    `json:"id" db:"Id"`
	UserId             string    `json:"user_id" db:"UserId"`
	Uid                *int      `json:"uid" db:"Uid"`
	Name               string    `json:"name" db:"Name"`
	Email              string    `json:"email" db:"Email"`
	Password           string    `json:"password" db:"Password"`
	PasswordChangeDate string    `json:"password_change_date" db:"PasswordChangeDate"`
	Comment            *string   `json:"comment" db:"Comment"`
	Department         *string   `json:"department" db:"Department"`
	Remark             *string   `json:"remark" db:"Remark"`
	UpdateDate         time.Time `json:"update_date" db:"UpdateDate"`
}

// @Summary Get user list
// @Description Get user list
// @Tags user
// @Produce  json
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/users [get]
func getUserList(w http.ResponseWriter, r *http.Request) {
	query := "SELECT * FROM USERS"
	users := make([]User_, 0)
	err := conn.Select(&users, query)

	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	format.JSON(w, http.StatusOK, users)
}

// @Summary Get user
// @Description Get user
// @Tags user
// @Produce  json
// @Param id path string true "User ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/users/{id} [get]
func getUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	query := fmt.Sprintf("SELECT * FROM USERS WHERE Id = '%s'", id)
	user := User_{}
	err := conn.Get(&user, query)

	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	format.JSON(w, http.StatusOK, user)
}

// swagger:model
type UserUpdate struct {
	Name     *string `json:"name" example:"rina"`
	Email    *string `json:"email" example:"a@gmail.com"`
	Password *string `json:"password" example:"12345678"`
	Comment  *string `json:"comment" example:"comment"`
}

// @Summary Update user
// @Description Update user
// @Tags user
// @Accept  json
// @Produce  json
// @Param id path string true "ID"
// @Param user body UserUpdate true "User"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/users/{id} [put]
func updateUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// body to struct
	var user UserUpdate
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
	}

	// select user id
	query := fmt.Sprintf("SELECT UserId FROM USERS WHERE Id = '%s'", id)
	user_id := ""
	err = conn.Get(&user_id, query)

	RequestLog := fmt.Sprintf("[%s] %s requested to modify user '%s'", LogProcessName, "admin", user_id)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: user_id,
	}

	var list_value []string
	var list_key []string

	if user.Name != nil {
		list_key = append(list_key, "Name")
		list_value = append(list_value, *user.Name)
	}

	if user.Email != nil {
		list_key = append(list_key, "Email")
		list_value = append(list_value, *user.Email)
	}

	if user.Password != nil {
		list_key = append(list_key, "Password")
		encryptedPassword := encryptString(*user.Password)
		list_value = append(list_value, encryptedPassword)
	}

	if user.Comment != nil {
		list_key = append(list_key, "Comment")
		list_value = append(list_value, *user.Comment)
	}

	var values []string

	for i, v := range list_key {
		values = append(values, fmt.Sprintf("%s = '%s'", v, list_value[i]))
	}

	update_value_string := strings.Join(values, ", ")

	query = fmt.Sprintf("UPDATE USERS SET %s WHERE Id = '%s'", update_value_string, id)
	fmt.Println(query)

	_, err = conn.Exec(query)

	if err != nil {
		UserLogMessage(LogPriority.Error, userLogMessageId.UserUpdateFail, logVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	} else {
		// if password was not null, update password change date
		if user.Password != nil {
			query := fmt.Sprintf("UPDATE USERS SET PasswordChangeDate = '%s' WHERE Id = '%s'", time.Now().Format("2006-01-02"), id)
			_, err := conn.Exec(query)

			if err != nil {
				UserLogMessage(LogPriority.Error, userLogMessageId.UserUpdateFail, logVariables)

				format.JSON(w, http.StatusInternalServerError, err.Error())
				return
			}

			// update smb password
			command := fmt.Sprintf("(echo %s; echo %s) | smbpasswd -as %s", user.Password, user.Password, id)
			_, cmd_err := exec.CommandContext(context.Background(), "sh", "-c", command).CombinedOutput()

			if cmd_err != nil {
				UserLogMessage(LogPriority.Error, userLogMessageId.UserUpdateFail, logVariables)

				format.JSON(w, http.StatusInternalServerError, cmd_err.Error())
				return
			}
		}
		// if other value was not null, update update date
		if user.Name != nil || user.Email != nil || user.Comment != nil {
			query := fmt.Sprintf("UPDATE USERS SET UpdateDate = '%s' WHERE Id = '%s'", time.Now().Format("2006-01-02 15:04:05"), id)
			_, err := conn.Exec(query)

			if err != nil {
				UserLogMessage(LogPriority.Error, userLogMessageId.UserUpdateFail, logVariables)

				format.JSON(w, http.StatusInternalServerError, err.Error())
				return
			}
		}
	}

	UserLogMessage(LogPriority.Info, userLogMessageId.UserUpdate, logVariables)

	format.JSON(w, http.StatusOK, "Updated successfully")
}

// swagger:model
type UserCreate struct {
	UserId   string  `json:"user_id" example:"user_name_1"`
	Name     string  `json:"name" example:"rina"`
	Email    string  `json:"email" example:"a@gmail.com"`
	Password string  `json:"password" example:"12345678"`
	Comment  *string `json:"comment" example:"comment"`
}

// @Summary Create user
// @Description Create user
// @Tags user
// @Accept  json
// @Produce  json
// @Param user body UserCreate true "User"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/users [post]
func createUser(w http.ResponseWriter, r *http.Request) {
	// body to struct
	var user UserCreate
	err := json.NewDecoder(r.Body).Decode(&user)
	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to create user '%s'", LogProcessName, "admin", user.UserId)
	UIRequestLog(RequestLog)

	var logMessageVariables = LogVariables{
		ObjectName: user.UserId,
	}

	// get uid_min and uid_max from query
	// var uid_min int
	// var uid_max int

	// query := fmt.Sprintf("SELECT uid_min, uid_max FROM SYSTEM_CONF_USER_GROUP WHERE UpdateDate = (SELECT MAX(UpdateDate) FROM SYSTEM_CONF_USER_GROUP)")
	// err = conn.QueryRow(query).Scan(&uid_min, &uid_max)

	// fmt.Println(uid_min, uid_max)

	// if err != nil {
	// 	format.JSON(w, 500, err.Error())
	// }

	// // get biggest uid from user list
	// var current_uid int

	// query = fmt.Sprintf("SELECT MAX(Uid) FROM USERS")
	// err = conn.QueryRow(query).Scan(&current_uid)

	// if err != nil {
	// 	current_uid = 0
	// }

	// // if current_uid is null, set current_uid to uid_min
	// if current_uid == 0 {
	// 	current_uid = uid_min
	// } else {
	// 	current_uid++
	// }

	// // if current_uid is bigger than uid_max, check if there is a gap between uid_min and uid_max in user list
	// if current_uid > uid_max {
	// 	query = fmt.Sprintf("SELECT MIN(Uid) FROM (SELECT %d Uid UNION SELECT Uid+1 FROM USERS) a WHERE Uid <= %d and Uid >= %d and Uid NOT IN (SELECT Uid FROM USERS)", uid_min, uid_max, uid_min)
	// 	err = conn.QueryRow(query).Scan(&current_uid)

	// 	if err != nil {
	// 		current_uid = 0
	// 	}

	// 	// if there is no gap, return error
	// 	if current_uid == 0 {
	// 		format.JSON(w, 500, "There is no available UID")
	// 		return
	// 	}
	// }

	encryptedPassword := encryptString(user.Password)

	var query string
	// create user
	if user.Comment == nil {
		query = fmt.Sprintf("INSERT INTO USERS (UserId, Name, Email, Password, PasswordChangeDate, UpdateDate) VALUES ('%s', '%s', '%s', '%s', '%s', '%s')", user.UserId, user.Name, user.Email, encryptedPassword, time.Now().Format("2006-01-02"), time.Now().Format("2006-01-02 15:04:05"))
	} else {
		query = fmt.Sprintf("INSERT INTO USERS (UserId, Name, Email, Password, PasswordChangeDate, Comment, UpdateDate) VALUES ('%s', '%s', '%s', '%s', '%s', '%s', '%s')", user.UserId, user.Name, user.Email, encryptedPassword, time.Now().Format("2006-01-02"), *user.Comment, time.Now().Format("2006-01-02 15:04:05"))
	}

	_, err = conn.Exec(query)

	if err != nil {
		UserLogMessage(LogPriority.Error, userLogMessageId.UserCreateFail, logMessageVariables)

		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	// cli command
	response := subprocess.Run("useradd", user.UserId, "--no-user-group", "--no-create-home", "--password", user.Password)

	if response.ExitCode != 0 {
		// delete user
		response_del := subprocess.Run("userdel", user.UserId)

		if response_del.ExitCode != 0 {
			format.JSON(w, http.StatusInternalServerError, response_del.StdErr)
		}

		// select id of user
		query = fmt.Sprintf("SELECT Id FROM USERS WHERE UserId = '%s'", user.UserId)
		var id string
		err = conn.QueryRow(query).Scan(&id)

		if err != nil {
			format.JSON(w, 500, err.Error())
		}

		// delete user from db
		query = fmt.Sprintf("DELETE FROM USERS WHERE Id = '%s'", id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, 500, err.Error())
		}

		UserLogMessage(LogPriority.Error, userLogMessageId.UserCreateFail, logMessageVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	// smb password
	command := fmt.Sprintf("(echo %s; echo %s) | smbpasswd -as %s", user.Password, user.Password, user.UserId)
	_, cmd_err := exec.CommandContext(context.Background(), "sh", "-c", command).CombinedOutput()

	if cmd_err != nil {
		// delete user
		response_del := subprocess.Run("userdel", user.UserId)

		if response_del.ExitCode != 0 {
			format.JSON(w, http.StatusInternalServerError, response_del.StdErr)
		}

		// select id of user
		query = fmt.Sprintf("SELECT Id FROM USERS WHERE UserId = '%s'", user.UserId)
		var id string
		err = conn.QueryRow(query).Scan(&id)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
		}

		// delete user from db
		query = fmt.Sprintf("DELETE FROM USERS WHERE Id = '%s'", id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, http.StatusInternalServerError, err.Error())
		}

		UserLogMessage(LogPriority.Error, userLogMessageId.UserCreateFail, logMessageVariables)

		format.JSON(w, http.StatusInternalServerError, cmd_err.Error())
		return
	}

	updateSMB()

	UserLogMessage(LogPriority.Info, userLogMessageId.UserCreate, logMessageVariables)

	format.JSON(w, http.StatusOK, "Created user successfully")
	return

}

// @Summary Delete user
// @Description Delete user
// @Tags user
// @Accept  json
// @Produce  json
// @Param id path string true "ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/users/{id} [delete]
func deleteUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// select user id
	query := fmt.Sprintf("SELECT UserId FROM USERS WHERE Id = '%s'", id)
	var user_id string
	err := conn.QueryRow(query).Scan(&user_id)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
		return
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to delete user '%s'", LogProcessName, "admin", user_id)
	UIRequestLog(RequestLog)

	var logMessageVariables = LogVariables{
		ObjectName: user_id,
	}

	// delete enties in user s3credentials
	query = fmt.Sprintf("DELETE FROM USER_S3CREDENTIAL WHERE UserRefId = '%s'", id)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
	}

	// delete entries in group_user_map
	query = fmt.Sprintf("DELETE FROM GROUP_USER_MAP WHERE UserRefId = '%s'", id)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
	}

	// delete enties in SMB_USER_MAP
	query = fmt.Sprintf("DELETE FROM SMB_USER_MAP WHERE UserRefId = '%s'", id)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, http.StatusInternalServerError, err.Error())
	}

	// delete user from db
	query = fmt.Sprintf("DELETE FROM USERS WHERE Id = '%s'", id)
	_, err = conn.Exec(query)

	if err != nil {
		UserLogMessage(LogPriority.Error, userLogMessageId.UserDeleteFail, logMessageVariables)
		format.JSON(w, 500, err.Error())
		return
	}

	// delete from smb
	response := subprocess.Run("smbpasswd", "-x", user_id)

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusInternalServerError, response.StdErr)
	}

	// cli command: userdel
	response = subprocess.Run("userdel", user_id)

	if response.ExitCode != 0 {
		UserLogMessage(LogPriority.Error, userLogMessageId.UserDeleteFail, logMessageVariables)

		format.JSON(w, http.StatusInternalServerError, response.StdErr)
		return
	}

	updateSMB()

	UserLogMessage(LogPriority.Info, userLogMessageId.UserDelete, logMessageVariables)

	format.JSON(w, http.StatusOK, "Deleted user successfully")
}

// swagger:model
type GroupUserMap struct {
	Id         string    `json:"id" db:"Id"`
	GroupRefId string    `json:"group_ref_id" db:"GroupRefId"`
	UserRefId  string    `json:"user_ref_id" db:"UserRefId"`
	UpdateDate time.Time `json:"update_date" db:"UpdateDate"`
}

// @Summary Get group user map list
// @Description Get group user map list
// @Tags group-user-maps
// @Produce  json
// @Param id path string true "User ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/group-user-maps-by-user/{id} [get]
func getGroupUserMapListByUserId(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	query := fmt.Sprintf("SELECT * FROM GROUP_USER_MAP WHERE UserRefId = '%s'", id)
	groupUserMaps := make([]GroupUserMap, 0)
	err := conn.Select(&groupUserMaps, query)

	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	format.JSON(w, http.StatusOK, groupUserMaps)
}

// swagger:model
type GroupsDelAppend struct {
	GroupsDel    []string `json:"groups_del" example:"group-name-1,group-name-2"`
	GroupsAppend []string `json:"groups_append" example:"group-name-1,group-name-2"`
}

// @Summary Set group user map list
// @Description Set group user map list
// @Tags group-user-maps
// @Produce  json
// @Param id path string true "User ID"
// @Param body body GroupsDelAppend true "GroupsDelAppend"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/group-user-maps-by-user/{id} [post]
func setGroupUserMapListForUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// select user id from users
	query := fmt.Sprintf("SELECT UserId FROM USERS WHERE Id = '%s'", id)
	var user_id string
	err := conn.QueryRow(query).Scan(&user_id)

	// get groups_del and groups_append from request body
	var groupsDelAppend GroupsDelAppend
	err = json.NewDecoder(r.Body).Decode(&groupsDelAppend)

	if err != nil {
		format.JSON(w, 400, err.Error())
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to (un)assign user '%s' to group(s)", LogProcessName, "admin", user_id)
	UIRequestLog(RequestLog)

	// delete groups from groups_del from database
	for _, groupId := range groupsDelAppend.GroupsDel {
		query := fmt.Sprintf("DELETE FROM GROUP_USER_MAP WHERE GroupRefId = '%s' AND UserRefId = '%s'", groupId, id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, 500, err.Error())
		}
	}

	var groupsAppend []string
	// insert groups from groups_append to database if not exists
	for _, groupId := range groupsDelAppend.GroupsAppend {
		query := fmt.Sprintf("SELECT * FROM GROUP_USER_MAP WHERE GroupRefId = '%s' AND UserRefId = '%s'", groupId, id)
		groupUserMap := GroupUserMap{}
		err = conn.Get(&groupUserMap, query)

		if err != nil {
			query = fmt.Sprintf("INSERT INTO GROUP_USER_MAP (GroupRefId, UserRefId, UpdateDate) VALUES ('%s', '%s', '%s')", groupId, id, time.Now().Format("2006-01-02 15:04:05"))
			_, err = conn.Exec(query)

			if err != nil {
				format.JSON(w, 500, err.Error())
				return
			}
		}

		// select group id fom groups
		query = fmt.Sprintf("SELECT GroupId FROM GROUPS WHERE Id = '%s'", groupId)
		var groupAppend string
		err = conn.QueryRow(query).Scan(&groupAppend)

		if err != nil {
			format.JSON(w, 500, err.Error())
			return
		}

		groupsAppend = append(groupsAppend, groupAppend)
	}

	var groups = strings.Join(groupsAppend, ",")

	var logVariables = LogVariables{
		ObjectName: user_id,
		TargetName: groups,
	}

	// cli command: usermod
	response := subprocess.Run("usermod", user_id, "--groups", groups)

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusBadRequest, response.StdErr)

		// delete all group user maps from database
		query = fmt.Sprintf("DELETE FROM GROUP_USER_MAP WHERE UserRefId = '%s'", id)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, 500, err.Error())
		}

		UserLogMessage(LogPriority.Error, userLogMessageId.GroupAssignFail, logVariables)

		return
	}

	UserLogMessage(LogPriority.Info, userLogMessageId.GroupAssign, logVariables)

	format.JSON(w, http.StatusOK, "Set group user map list for user successfully")
}

// @Summary Get assigned groups by user id
// @Description Get assigned groups by user id
// @Tags user
// @Produce  json
// @Param id path string true "User ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/users/assigned-groups/{id} [get]
func getAssignedGroupsByUserId(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	// initialize array of Group
	groups := make([]Group, 0)
	// get list of all Groups
	query := fmt.Sprintf("SELECT * FROM GROUPS")
	err := conn.Select(&groups, query)

	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	// initialize array of GroupUserMap
	groupUserMaps := make([]GroupUserMap, 0)
	// get list of all GroupUserMaps
	query = fmt.Sprintf("SELECT * FROM GROUP_USER_MAP WHERE UserRefId = '%s'", id)
	err = conn.Select(&groupUserMaps, query)

	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	// initialize array of Group
	assignedGroups := make([]Group, 0)
	// loop through all groups
	for _, group := range groups {
		// loop through all group user maps
		for _, groupUserMap := range groupUserMaps {
			// if group id matches group user map group id
			if group.Id == groupUserMap.GroupRefId {
				// add group to assigned groups
				assignedGroups = append(assignedGroups, group)
				break
			}
		}
	}

	format.JSON(w, http.StatusOK, assignedGroups)
}

// @Summary Check if a user exists
// @Description Check if a user exists
// @Tags user
// @Produce  json
// @Param userId path string true "User ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/users/user-id-taken/{userId} [get]
func userIdTaken(w http.ResponseWriter, r *http.Request) {
	userId := chi.URLParam(r, "userId")
	response := subprocess.Run("grep", userId, "/etc/passwd")
	if response.StdOut == "" {
		format.JSON(w, http.StatusOK, false)
		return
	} else {
		lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")
		for _, line := range lines {
			userIdLine := strings.Split(line, ":")[0]
			if userIdLine == userId {
				format.JSON(w, http.StatusOK, true)
				return
			}
		}
	}

	format.JSON(w, http.StatusOK, false)
}
