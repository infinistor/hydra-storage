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

const windowWidth = 600;
export default class AddUser extends JetView {
	config() {
		var share_id
		var readonly

		var mainShareSearchResult

		var self = this

		const topBar = 48
		return {
			view: "window",
			id: "add_user_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Assign Users to Share", css: "header_label" }
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
								view: "search",
								placeholder: "Search",
								id: "addUserSearch",
								width: 150,
								on: {
									onTimedKeyPress: () => {
										$$("smbAddUserTable").filterByAll()
									}
								}
							}
						]
					},
					{
						view: "datatable",
						id: "smbAddUserTable",
						borderless: true,
						autoheight: true,
						headerRowHeight: 30,
						select: "row",
						multiselect: true,
						columns: [
							{
								id: "user_id", header: "User ID", adjust: "data", template(obj, data, value) {
									return searchColumnTemplate(value, mainShareSearchResult)
								}
							},
							{
								id: "name", header: "Name", adjust: "data", template(obj, data, value) {
									return searchColumnTemplate(value, mainShareSearchResult)
								}
							},
							{
								id: "comment", header: "Comment", fillspace: true, template(obj, data, value) {
									return searchColumnTemplate(value, mainShareSearchResult)
								}
							},
							{
								id: "readwrite", header: "Read/Write", template: (obj) => {
									if (readonly) return "<input disabled class='webix_table_checkbox' type='checkbox'>"
									else return `<input class='webix_table_checkbox' type='checkbox'${obj.readwrite == true ? " checked = 'true'" : ""}>`
								}, adjust: "header", css: "checkboxCenter"
							},
							{
								id: "readonly", header: "Read Only", template: (obj) => {
									return `<input class='webix_table_checkbox' type='checkbox'${obj.readonly == true ? " checked = 'true'" : ""}>`
								}, adjust: "header", css: "checkboxCenter"
							},
						],
						scroll: "y",
						on: {
							onCheck: function (rowId, columnId, state) {
								if (!state) {
									if (columnId == "readwrite") {
										this.updateItem(rowId, { readwrite: 0 })
									} else if (columnId == "readonly") {
										this.updateItem(rowId, { readonly: 0 })
									}

									this.unselect(rowId, true)
								} else {
									if (columnId == "readwrite") {
										this.updateItem(rowId, { readonly: 0, readwrite: 1 })
									} else if (columnId == "readonly") {
										this.updateItem(rowId, { readwrite: 0, readonly: 1 })
									}

									this.select(rowId, true)
								}
							},
							onAfterLoad: function () {
								this.serialize().forEach((row) => {
									if (row.readonly == 1 || row.readwrite == 1)
										this.select(row.id, true)
								})
							},
							onBeforeSelect: function (selection, preserve) {
								if (selection.column)
									return false
								else {
									return true
								}
							},
							onBeforeFilter(column, value) {
								mainShareSearchResult = value
							},
							onAfterFilter() {
								this.serialize().forEach((row) => {
									if (row.readonly == 1 || row.readwrite == 1)
										this.select(row.id, true)
								})
							}
						}
					},
					{},
					{
						paddingX: 10,
						cols: [
							{
								view: "button",
								value: "Apply",
								css: "new_style_primary",
								width: 70,
								click: () => {
									var json_users = []
									$$("smbAddUserTable").serialize().forEach((row) => {
										if ($$("smbAddUserTable").isSelected(row.id)) {
											if (row.readonly == 1) {
												json_users.push({ user_id: row.id, user_name: row.user_id, permission: "r" })
											} else if (row.readwrite == 1) {
												json_users.push({ user_id: row.id, user_name: row.user_id, permission: "w" })
											}
										}
									})

									if (json_users.length == 0) {
										webix.message({ type: "error", text: "No users selected" })
										return
									} else {
										webix.ajax().put("/api/smb/shares/" + share_id + "/users", JSON.stringify(json_users)).then((data) => {
											var usersTable = $$("share_datatable").getSubView(share_id).getChildViews()[2]

											usersTable.clearAll()
											usersTable.load("/api/smb/shares/" + share_id + "/users").then(function () {
												$$("share_datatable").resizeSubView(share_id)
											})

											this.hideWindow()
											webix.message({ type: "success", text: data.json(), expire: 2000 })
										}).fail((xhr) => {
											ajaxFail(xhr)
										})
									}

								}
							},
							{
								view: "button",
								value: "Cancel",
								css: "new_style_button",
								width: 70,
								click: () => {
									this.hideWindow()
								}
							}
						]
					},
					{
						height: 10
					}
				]
			},
			position: function (state) {
				state.top = topBar
				state.left = state.maxWidth - windowWidth
				state.height = state.maxHeight - (topBar)
				state.width = windowWidth
			},
			on: {
				onShow: function () {
					share_id = self.getParam("id", true)
					readonly = self.getParam("readonly", true)

					$$("smbAddUserTable").load("/api/users").then(() => {
						$$("smbAddUserTable").serialize().forEach((row) => {
							row.readonly = 0
							row.readwrite = 0
							$$("smbAddUserTable").unselect(row.id, true)
						})
						$$("smbAddUserTable").refresh()

						// select rows if they are associated with the share
						webix.ajax().get("/api/smb/shares/" + share_id + "/users").then((data) => {
							var users = data.json()

							if (users.length != 0) {
								$$("smbAddUserTable").serialize().forEach((row) => {
									users.forEach((user) => {
										if (row.id == user.user_id) {
											if (user.permission == "r") {
												row.readonly = 1
											} else {
												row.readwrite = 1
											}
											$$("smbAddUserTable").select(row.id, true)
										}
									})
								})
								$$("smbAddUserTable").refresh()
							}
						})
					})
				},
				onHide: () => {
					$$("addUserSearch").setValue("")
				}
			}
		}
	}
	ready() {
		var addUserWindow = $$("add_user_window")

		webix.UIManager.addHotKey("esc", function () {
			if (addUserWindow.isVisible())
				addUserWindow.hide()
		})

		$$("smbAddUserTable").registerFilter(
			$$("addUserSearch"),
			{
				columnId: "any",
				compare: function (value, filter, item) {
					if (filter == "") return true
					else {
						var user_id = item.user_id.toLowerCase()
						var name = item.name.toLowerCase()
						var comment = ""
						if (item.comment) var comment = item.comment.toLowerCase()
						filter = filter.toLowerCase()
						var any = user_id + name + comment
						if (any.indexOf(filter) != -1) return true
						else return false
					}
				}
			},
			{
				getValue: function (node) {
					return node.getValue().toLowerCase()
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