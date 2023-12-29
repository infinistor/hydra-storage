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
export default class AddUserToGroupWindow extends JetView {
	config() {
		const topBar = 48
		var initialGroups = []
		var mainSearchResult = ""

		var user_id

		return {
			view: "window",
			id: "user_to_group_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Assign User to Groups" }
				],
			},
			body: {
				rows: [
					{
						view: "toolbar",
						borderless: true,
						elements: [
							{},
							{
								view: "search", width: windowWidth / 3, placeholder: "Search", id: "userToGroupSearch", on: {
									onTimedKeyPress: () => {
										$$("user_to_group_table").filterByAll()
									}
								}
							}
						]
					},
					{
						view: "datatable",
						borderless: true,
						id: "user_to_group_table",
						autoheight: true,
						select: "row",
						multiselect: true,
						headerRowHeight: 24,
						rowHeight: 27,
						scroll: "y",
						columns: [
							{
								id: "group_id", header: "Group ID", adjust: true, template(obj, data, value) {
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
						url: "/api/groups",
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
									var selectedGroups = $$("user_to_group_table").getSelectedId()
									var groups_append = []
									if (selectedGroups) {
										if (!selectedGroups.length) {
											groups_append.push(selectedGroups.row)
										} else {
											selectedGroups.forEach((group) => {
												groups_append.push(group.row)
											})
										}
									}

									var groups_remove = []

									// add groups that are not in selectedGroups but in initialGroups to groups_remove
									initialGroups.forEach((group) => {
										if (groups_append.indexOf(group) < 0) {
											groups_remove.push(group)
										}
									})

									var groupsDelAppend = {
										"groups_append": groups_append,
										"groups_del": groups_remove
									}

									webix.ajax().post("/api/group-user-maps-by-user/" + user_id, JSON.stringify(groupsDelAppend)).then((data) => {
										var message = data.json()

										webix.message({
											type: "success",
											expire: 10000,
											text: message
										})

										var groupsTable = $$("usersTable").getSubView(user_id).getChildViews()[1]

										groupsTable.clearAll()
										groupsTable.load("/api/users/assigned-groups/" + user_id).then(function () {
											$$("usersTable").resizeSubView(user_id)
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
							}
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
					initialGroups = []
					user_id = this.getParam("id", true)

					// reselect all rows
					$$("user_to_group_table").serialize().forEach((row) => {
						row.assigned = 0
						$$("user_to_group_table").unselect(row.id, true)
					})
					$$("user_to_group_table").refresh()

					// select rows to which group user is assigned
					webix.ajax().get("/api/group-user-maps-by-user/" + user_id).then((data) => {
						var userGroups = data.json()
						if (userGroups.length != 0) {
							$$("user_to_group_table").serialize().forEach((row) => {
								userGroups.forEach((userGroup) => {
									if (row.id == userGroup.group_ref_id) {
										row.assigned = 1
										initialGroups.push(userGroup.group_ref_id)
										$$("user_to_group_table").select(row.id, true)
									}
								})
							})
							$$("user_to_group_table").refresh()
						}
					})
				}
			}
		}
	}
	ready() {
		var userToGroupWindow = $$("user_to_group_window")

		webix.UIManager.addHotKey("esc", function () {
			if (userToGroupWindow.isVisible())
				userToGroupWindow.hide()
		})

		$$("user_to_group_table").registerFilter(
			$$("userToGroupSearch"),
			{
				columnId: "any",
				compare: function (value, filter, item) {
					filter = filter.toLowerCase()
					var group_id = item.group_id.toString().toLowerCase()
					var comment = item.comment.toString().toLowerCase()
					var any = group_id + comment
					return any.indexOf(filter) !== -1
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