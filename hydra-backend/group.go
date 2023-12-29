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
	"time"

	"github.com/go-chi/chi"
	"gopkg.in/pygz/subprocess.v1"
)

// swagger:model
type Group struct {
	Id         string    `json:"id" db:"Id"`
	GroupId    string    `json:"group_id" db:"GroupId"`
	Gid        *int      `json:"gid" db:"Gid"`
	Comment    *string   `json:"comment" db:"Comment"`
	Remark     *string   `json:"remark" db:"Remark"`
	UpdateDate time.Time `json:"update_date" db:"UpdateDate"`
}

// @Summary Get group list
// @Description Get group list
// @Tags group
// @Produce  json
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/groups [get]
func getGroupList(w http.ResponseWriter, r *http.Request) {
	query := "SELECT * FROM GROUPS"
	groups := make([]Group, 0)
	err := conn.Select(&groups, query)

	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	format.JSON(w, http.StatusOK, groups)
}

// @Summary Get group
// @Description Get group
// @Tags group
// @Produce  json
// @Param id path string true "Group ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/groups/{id} [get]
func getGroup(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	query := fmt.Sprintf("SELECT * FROM GROUPS WHERE Id = '%s'", id)
	group := Group{}
	err := conn.Get(&group, query)

	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	format.JSON(w, http.StatusOK, group)
}

// swagger:model
type GroupCreate struct {
	GroupId string  `json:"group_id" example:"group-name-1"`
	Comment *string `json:"comment" example:"comment"`
	Remark  *string `json:"remark" example:"remark"`
}

// @Summary Create group
// @Description Create group
// @Tags group
// @Produce  json
// @Param body body GroupCreate true "Group Create"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/groups [post]
func createGroup(w http.ResponseWriter, r *http.Request) {
	groupCreate := GroupCreate{}

	err := json.NewDecoder(r.Body).Decode(&groupCreate)
	if err != nil {
		format.JSON(w, 400, err.Error())
	}

	RequestLog := fmt.Sprintf("[%s] %s requested to create group '%s'", LogProcessName, "admin", groupCreate.GroupId)
	UIRequestLog(RequestLog)

	// get min_gid and max_gid from query
	// var gid_min int
	// var gid_max int

	// query := fmt.Sprintf("SELECT gid_min, gid_max FROM SYSTEM_CONF_USER_GROUP WHERE UpdateDate = (SELECT MAX(UpdateDate) FROM SYSTEM_CONF_USER_GROUP)")
	// err = conn.QueryRow(query).Scan(&gid_min, &gid_max)

	// fmt.Println(gid_min, gid_max)

	// if err != nil {
	// 	format.JSON(w, 500, err.Error())
	// }

	// // get biggest gid from group list
	// var current_gid int

	// query = fmt.Sprintf("SELECT MAX(Gid) FROM GROUPS")
	// err = conn.QueryRow(query).Scan(&current_gid)

	// if err != nil {
	// 	current_gid = 0
	// }

	// // if current_gid is null, set current_gid to gid_min
	// if current_gid == 0 {
	// 	current_gid = gid_min
	// } else {
	// 	current_gid++
	// }

	// // if current_gid is bigger than gid_max, check if there is a gap between gid_min and gid_max in group list
	// if current_gid > gid_max {
	// 	query = fmt.Sprintf("SELECT MIN(Gid) FROM (SELECT %d Gid UNION SELECT Gid+1 FROM GROUPS) a WHERE Gid <= %d and Gid >= %d and Gid NOT IN (SELECT Gid FROM GROUPS)", gid_min, gid_max, gid_min)
	// 	err = conn.QueryRow(query).Scan(&current_gid)

	// 	if err != nil {
	// 		current_gid = 0
	// 	}

	// 	// if there is no gap, return error
	// 	if current_gid == 0 {
	// 		format.JSON(w, 500, "There is no available GID")
	// 		return
	// 	}
	// }

	// create group
	var comment string
	if groupCreate.Comment == nil {
		comment = ""
	} else {
		comment = *groupCreate.Comment
	}

	var remark string
	if groupCreate.Remark == nil {
		remark = ""
	} else {
		remark = *groupCreate.Remark
	}

	var logVariables = LogVariables{
		ObjectName: groupCreate.GroupId,
	}

	query := fmt.Sprintf("INSERT INTO GROUPS (GroupId, Comment, Remark, UpdateDate) VALUES ('%s', '%s', '%s', '%s')", groupCreate.GroupId, comment, remark, time.Now().Format("2006-01-02 15:04:05"))
	_, err = conn.Exec(query)

	if err != nil {
		GroupLogMessage(LogPriority.Error, groupLogMessageId.GroupCreateFail, logVariables)

		format.JSON(w, 500, err.Error())
		return
	}

	// cli command: add group
	response := subprocess.Run("groupadd", groupCreate.GroupId)

	if response.ExitCode != 0 {
		format.JSON(w, http.StatusBadRequest, response.StdErr)

		response = subprocess.Run("groupdel", groupCreate.GroupId)

		if response.ExitCode != 0 {
			format.JSON(w, http.StatusBadRequest, response.StdErr)
		}

		query = fmt.Sprintf("DELETE FROM GROUPS WHERE GroupId = '%s'", groupCreate.GroupId)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, 500, err.Error())
		}

		GroupLogMessage(LogPriority.Error, groupLogMessageId.GroupCreateFail, logVariables)

		return
	}

	GroupLogMessage(LogPriority.Info, groupLogMessageId.GroupCreate, logVariables)

	format.JSON(w, http.StatusOK, "Created group successfully")
}

// swagger:model
type GroupUpdate struct {
	Comment *string `json:"comment" example:"comment"`
}

// @Summary Update group
// @Description Update group
// @Tags group
// @Produce  json
// @Param id path string true "Group ID"
// @Param body body GroupUpdate true "Group Update"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/groups/{id} [put]
func updateGroup(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	groupUpdate := GroupUpdate{}

	err := json.NewDecoder(r.Body).Decode(&groupUpdate)
	if err != nil {
		format.JSON(w, 400, err.Error())
	}

	var comment string
	if groupUpdate.Comment == nil {
		comment = ""
	} else {
		comment = *groupUpdate.Comment
	}

	// select group id from database
	var group_id string
	query := fmt.Sprintf("SELECT GroupId FROM GROUPS WHERE Id = '%s'", id)
	err = conn.QueryRow(query).Scan(&group_id)

	RequestLog := fmt.Sprintf("[%s] %s requested to modify group '%s'", LogProcessName, "admin", group_id)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: group_id,
	}

	query = fmt.Sprintf("UPDATE GROUPS SET Comment = '%s', UpdateDate = '%s' WHERE Id = '%s'", comment, time.Now().Format("2006-01-02 15:04:05"), id)
	_, err = conn.Exec(query)

	if err != nil {
		GroupLogMessage(LogPriority.Error, groupLogMessageId.GroupUpdateFail, logVariables)

		format.JSON(w, 500, err.Error())
		return
	}

	GroupLogMessage(LogPriority.Info, groupLogMessageId.GroupUpdate, logVariables)

	format.JSON(w, http.StatusOK, "Updated group successfully")
}

// @Summary Delete group
// @Description Delete group
// @Tags group
// @Produce  json
// @Param id path string true "Group ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/groups/{id} [delete]
func deleteGroup(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// select group id
	var group_id string
	query := fmt.Sprintf("SELECT GroupId FROM GROUPS WHERE Id = '%s'", id)
	err := conn.QueryRow(query).Scan(&group_id)

	RequestLog := fmt.Sprintf("[%s] %s requested to delete group '%s'", LogProcessName, "admin", group_id)
	UIRequestLog(RequestLog)

	var logVariables = LogVariables{
		ObjectName: group_id,
	}

	// delete entries in group_user_map
	query = fmt.Sprintf("DELETE FROM GROUP_USER_MAP WHERE GroupRefId = '%s'", id)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	query = fmt.Sprintf("DELETE FROM GROUPS WHERE Id = '%s'", id)
	_, err = conn.Exec(query)

	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	// cli command: delete group
	response := subprocess.Run("groupdel", group_id)

	if response.ExitCode != 0 {
		GroupLogMessage(LogPriority.Error, groupLogMessageId.GroupDeleteFail, logVariables)

		format.JSON(w, http.StatusBadRequest, response.StdErr)
		return
	}

	GroupLogMessage(LogPriority.Info, groupLogMessageId.GroupDelete, logVariables)

	format.JSON(w, http.StatusOK, "Deleted group successfully")
}

// @Summary Get group user map list
// @Description Get group user map list
// @Tags group-user-maps
// @Produce  json
// @Param id path string true "Group ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/group-user-maps-by-group/{id} [get]
func getGroupUserMapListByGroupId(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	query := fmt.Sprintf("SELECT * FROM GROUP_USER_MAP WHERE GroupRefId = '%s'", id)
	groupUserMaps := make([]GroupUserMap, 0)
	err := conn.Select(&groupUserMaps, query)

	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	format.JSON(w, http.StatusOK, groupUserMaps)
}

type UsersDelAppend struct {
	UsersDel    []string `json:"users_del" example:"user1,user2"`
	UsersAppend []string `json:"users_append" example:"user3,user4"`
}

// @Summary Set group user map list
// @Description Set group user map list
// @Tags group-user-maps
// @Produce  json
// @Param id path string true "Group ID"
// @Param body body UsersDelAppend true "Users Del Append"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/group-user-maps-by-group/{id} [post]
func setGroupUserMapListByGroupId(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// get user del and append list from request body
	usersDelAppend := UsersDelAppend{}
	err := json.NewDecoder(r.Body).Decode(&usersDelAppend)

	if err != nil {
		format.JSON(w, http.StatusBadRequest, err.Error())
	}

	// select group id from database
	var group_id string
	query := fmt.Sprintf("SELECT GroupId FROM GROUPS WHERE Id = '%s'", id)
	err = conn.QueryRow(query).Scan(&group_id)

	RequestLog := fmt.Sprintf("[%s] %s requested to (un)assign user(s) from group '%s'", LogProcessName, "admin", group_id)
	UIRequestLog(RequestLog)

	// delete users from users_del from database
	for _, userDel := range usersDelAppend.UsersDel {
		// select user id from database
		var user_id string
		query := fmt.Sprintf("SELECT UserId FROM USERS WHERE Id = '%s'", userDel)
		err = conn.QueryRow(query).Scan(&user_id)

		if err != nil {
			format.JSON(w, 500, err.Error())
			return
		}

		query = fmt.Sprintf("DELETE FROM GROUP_USER_MAP WHERE GroupRefId = '%s' AND UserRefId = '%s'", id, userDel)
		_, err = conn.Exec(query)

		if err != nil {
			format.JSON(w, 500, err.Error())
		}

		// select all groups of user
		query = fmt.Sprintf("SELECT GroupRefId FROM GROUP_USER_MAP WHERE UserRefId = '%s'", userDel)
		groupIds := make([]string, 0)
		err = conn.Select(&groupIds, query)

		if err != nil {
			format.JSON(w, 500, err.Error())
			return
		}

		// select each group id from groupIds
		groups := make([]string, 0)
		for _, groupId := range groupIds {
			var group_id string
			query = fmt.Sprintf("SELECT GroupId FROM GROUPS WHERE Id = '%s'", groupId)
			err = conn.QueryRow(query).Scan(&group_id)

			if err != nil {
				format.JSON(w, 500, err.Error())
				return
			}

			groups = append(groups, group_id)
		}

		// cli command: usermod add groups
		response := subprocess.Run("usermod", user_id, "--groups", strings.Join(groups, ","))

		if response.ExitCode != 0 {
			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}
	}

	var userIds []string

	var logVariables = LogVariables{
		ObjectName: group_id,
	}

	// insert users from users_append to database
	for _, userAppend := range usersDelAppend.UsersAppend {
		// select user id from database
		var user_id string
		query := fmt.Sprintf("SELECT UserId FROM USERS WHERE Id = '%s'", userAppend)
		err = conn.QueryRow(query).Scan(&user_id)

		userIds = append(userIds, user_id)

		if err != nil {
			GroupLogMessage(LogPriority.Error, groupLogMessageId.UserAssignFail, logVariables)

			format.JSON(w, 500, err.Error())
			return
		}

		// insert user to group_user_map
		query = fmt.Sprintf("INSERT INTO GROUP_USER_MAP (GroupRefId, UserRefId, UpdateDate) VALUES ('%s', '%s', '%s')", id, userAppend, time.Now().Format("2006-01-02 15:04:05"))
		_, err = conn.Exec(query)

		if err != nil {
			GroupLogMessage(LogPriority.Error, groupLogMessageId.UserAssignFail, logVariables)

			format.JSON(w, 500, err.Error())
			return
		}

		// select group id from database
		var group_id string
		query = fmt.Sprintf("SELECT GroupId FROM GROUPS WHERE Id = '%s'", id)
		err = conn.QueryRow(query).Scan(&group_id)

		if err != nil {
			GroupLogMessage(LogPriority.Error, groupLogMessageId.UserAssignFail, logVariables)

			format.JSON(w, 500, err.Error())
			return
		}

		// cli command: append group to user
		response := subprocess.Run("usermod", user_id, "--append", "--groups", group_id)

		if response.ExitCode != 0 {
			GroupLogMessage(LogPriority.Error, groupLogMessageId.UserAssignFail, logVariables)

			format.JSON(w, http.StatusInternalServerError, response.StdErr)
			return
		}

		logVariables.TargetName = strings.Join(userIds, ",")
	}

	GroupLogMessage(LogPriority.Info, groupLogMessageId.UserAssign, logVariables)

	format.JSON(w, http.StatusOK, "Set group user map list for group successfully")
}

// @Summary Get assigned users by group id
// @Description Get assigned users by group id
// @Tags group
// @Produce  json
// @Param id path string true "Group ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/groups/assigned-users/{id} [get]
func getAssignedUsersByGroupId(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	// initialize array of Users
	users := make([]User_, 0)
	// get list of all users
	query := fmt.Sprintf("SELECT * FROM USERS")
	err := conn.Select(&users, query)

	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	// initialize array of GroupUserMap
	groupUserMaps := make([]GroupUserMap, 0)
	// get list of all group user maps
	query = fmt.Sprintf("SELECT * FROM GROUP_USER_MAP WHERE GroupRefId = '%s'", id)
	err = conn.Select(&groupUserMaps, query)

	if err != nil {
		format.JSON(w, 500, err.Error())
	}

	// initialize array of User
	assignedUsers := make([]User_, 0)
	// loop through all users
	for _, user := range users {
		// loop through all group user maps
		for _, groupUserMap := range groupUserMaps {
			// if user id matches group user map user id
			if user.Id == groupUserMap.UserRefId {
				// add user to assigned users
				assignedUsers = append(assignedUsers, user)
			}
		}
	}

	format.JSON(w, http.StatusOK, assignedUsers)
}

// @Summary Check if a group exists
// @Description Check if a group exists
// @Tags group
// @Produce  json
// @Param groupId path string true "Group ID"
// @Success 200 {object} Response
// @Failure 400 {object} Response
// @Failure 500 {object} Response
// @Router /api/groups/group-id-taken/{groupId} [get]
func groupIdTaken(w http.ResponseWriter, r *http.Request) {
	groupId := chi.URLParam(r, "groupId")
	response := subprocess.Run("grep", groupId, "/etc/group")
	if response.StdOut == "" {
		format.JSON(w, http.StatusOK, false)
		return
	} else {
		lines := strings.Split(strings.ReplaceAll(response.StdOut, "\r\n", "\n"), "\n")
		for _, line := range lines {
			groupIdLine := strings.Split(line, ":")[0]
			if groupIdLine == groupId {
				format.JSON(w, http.StatusOK, true)
				return
			}
		}
	}

	format.JSON(w, http.StatusOK, false)
}
