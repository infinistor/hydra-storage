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
import { JetView } from "webix-jet";

import { searchColumnTemplate } from "../../../../functions/searchTemplate";
import { ajaxFail } from "../../../../functions/ajaxFail";

const windowWidth = 500;
export default class AddGroupToUserWindow extends JetView {
	config() {
		const backend_url = this.app.config.backend_url

		const topBar = 48
		var initialUsers = []
		var mainSearchResult = ""

		var group_id

		return {
			view: "window",
			id: "group_to_user_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Assign Users to Group" }
				],
			},
			body: {
				rows: [
					{
						view: "toolbar",
						elements: [
							{},
							{
								view: "search", width: windowWidth / 3, placeholder: "Search", id: "groupToUserSearch", on: {
									onTimedKeyPress: () => {
										$$("group_to_user_table").filterByAll()
									}
								}
							}
						]
					},
					{
						view: "datatable",
						id: "group_to_user_table",
						autoheight: true,
						select: "row",
						multiselect: true,
						scroll: "y",
						columns: [
							{
								id: "user_id", header: "User ID", adjust: true, template(obj, data, value) {
									return searchColumnTemplate(value, mainSearchResult)
								}
							},
							{
								id: "name", header: "Name", adjust: true, template(obj, data, value) {
									return searchColumnTemplate(value, mainSearchResult)
								}
							},
							{
								id: "comment", header: "Comment", fillspace: true, template(obj, data, value) {
									return searchColumnTemplate(value, mainSearchResult)
								}
							},
							{ id: "assigned", header: "Assigned", template: "{common.checkbox()}", css: "checkboxCenter", adjust: "header" }
						],
						on: {
							onCheck: function (row, column, state) {
								if (state)
									this.select(row, true)
								else
									this.unselect(row)
							},
							onBeforeSelect: function (selection, preserve) {
								if (selection.column)
									return false
								else {
									return true
								}
							},
							onBeforeFilter: function (column, value) {
								if (column == "any") {
									mainSearchResult = value
								}
							},
							onAfterFilter: function () {
								this.serialize().forEach((row) => {
									if (row.assigned == 1) {
										this.select(row.id, true)
									}
								})
							}
						}
					},
					{},
					{
						paddingX: 10, paddingY: 15,
						cols: [
							{
								view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
									var group_id = this.getParam("id", true)
									var selectedUsers = $$("group_to_user_table").getSelectedId()
									var users_append = []
									if (selectedUsers) {
										if (!selectedUsers.length) {
											users_append.push(selectedUsers.row)
										} else {
											selectedUsers.forEach((user) => {
												users_append.push(user.row)
											})
										}
									}

									var users_remove = []

									// add groups that are not in selectedGroups but in initialUsers to users_remove
									initialUsers.forEach((user) => {
										if (users_append.indexOf(user) < 0) {
											users_remove.push(user)
										}
									})

									var usersDelAppend = {
										"users_append": users_append,
										"users_del": users_remove
									}

									webix.ajax().post("/api/group-user-maps-by-group/" + group_id, JSON.stringify(usersDelAppend)).then((data) => {
										var message = data.json()
										webix.message({
											type: "success",
											expire: 10000,
											text: message
										})
										var usersTable = $$("groupsTable").getSubView(group_id).getChildViews()[1]

										usersTable.clearAll()
										usersTable.load("/api/groups/assigned-users/" + group_id).then(function () {
											$$("groupsTable").resizeSubView(group_id)
										})

										this.hideWindow()
									}).fail((xhr) => {
										ajaxFail(xhr)
									})
								}
							},
							{
								view: "button", value: "Cancel", css: "new_style_button", width: 70, click: () => {
									this.hideWindow()
								}
							},
							{}
						]
					}
				]
			},
			position: function (state) {
				state.top = topBar
				state.left = state.maxWidth - windowWidth
				state.height = state.maxHeight - (topBar)
				state.width = windowWidth
			}, on: {
				onShow: () => {
					initialUsers = []
					$$("group_to_user_table").load("/api/users").then(() => {
						group_id = this.getParam("id", true)

						// reselect all rows
						$$("group_to_user_table").serialize().forEach((row) => {
							row.assigned = 0
							$$("group_to_user_table").unselect(row.id, true)
						})
						$$("group_to_user_table").refresh()

						// select rows to which group user is assigned
						webix.ajax().get("/api/group-user-maps-by-group/" + group_id).then((data) => {
							var groupUsers = data.json()
							if (groupUsers.length != 0) {
								$$("group_to_user_table").serialize().forEach((row) => {
									groupUsers.forEach((groupUser) => {
										if (row.id == groupUser.user_ref_id) {
											row.assigned = 1
											initialUsers.push(row.id)
											$$("group_to_user_table").select(row.id, true)
										}
									})
								})
								$$("group_to_user_table").refresh()
							}
						})
					})

				}
			}
		}
	}
	ready() {
		var groupToUserWindow = $$("group_to_user_window")

		webix.UIManager.addHotKey("esc", function () {
			if (groupToUserWindow.isVisible())
				groupToUserWindow.hide()
		})

		$$("group_to_user_table").registerFilter(
			$$("groupToUserSearch"),
			{
				columnId: "any", compare: function (value, filter, item) {
					filter = filter.toLowerCase()
					var user_id = item.user_id.toString().toLowerCase()
					var name = item.name.toString().toLowerCase()
					var comment = item.comment.toString().toLowerCase()
					var any = user_id + name + comment
					if (any.indexOf(filter) != -1) {
						return true
					} else {
						return false
					}
				}
			},
			{
				getValue: function (node) {
					return node.getValue()
				},
				setValue: function (node, value) {
					node.setValue(value)
				}
			}
		)
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
}