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
import UserSettingsMenu from "./context menus/userSettingsMenu";
import AddUserWindow from "./windows/addUserWindow";

import { searchColumnTemplateWithSubview } from "../../../functions/searchTemplate";
import { ajaxFail } from "../../../functions/ajaxFail";

var addUserWindow
var addUserToGroupWindow
var addS3CredentialsWindow

export default class UserTab extends JetView {
	config() {
		var addUser = this.addUser
		var addUserToGroup = this.addUserToGroup
		var addS3Credentials = this.addS3Credentials
		var baseView = this

		var mainSearchValue = ""

		function checkIfAnyObjectIsAssignedToUser(object, groupTable, s3Table, noGroupAlert, noS3CredAlert) {
			if (object == "Groups") {
				if (groupTable.count() == 0) {
					noGroupAlert.show()
					groupTable.hide()
				} else {
					noGroupAlert.hide()
					groupTable.show()
				}
				s3Table.hide()
				noS3CredAlert.hide()
			} else {
				if (s3Table.count() == 0) {
					noS3CredAlert.show()
					s3Table.hide()
				} else {
					noS3CredAlert.hide()
					s3Table.show()
				}
				groupTable.hide()
				noGroupAlert.hide()
			}
		}

		return {
			id: "users",
			borderless: true,
			rows: [
				{ height: 15 },
				{
					rows: [
						{
							type: "line", paddingX: 15,
							rows: [
								{
									view: "toolbar",
									// css: "bottomline",
									borderless: true,
									elements: [
										{ width: 8 },
										{
											view: "richselect", id: "usersRichselect", options: ["Local Users", "Remote Users"], value: "Local Users", width: 200, on: {
												onChange: function (newv, oldv) {
													// if "Remote Users" is selected, prevent it and set it back to "Local Users"
													if (newv == "Remote Users") {
														this.setValue("Local Users")
													}
												}
											}
										},
										{
											view: "icon", icon: "mdi mdi-plus", css: "icon-button", click: () => {
												this.setParam("id", "", false)
												addUser()
											}
										},
										{
											view: "icon", icon: "mdi mdi-reload", css: "icon-button", click: () => {
												$$("userTabMainSearch").setValue("")
												mainSearchValue = ""

												$$("usersTable").filterByAll()
												$$("usersTable").clearAll()
												$$("usersTable").load("/api/users")

											}
										},
										{},
										{
											view: "search", width: 250, placeholder: "Search", id: "userTabMainSearch", on: {
												onTimedKeyPress: function () {
													$$("usersTable").filterByAll()
												}
											}
										},
										{ width: 8 }
									]
								},
								{
									view: "datatable",
									id: "usersTable",
									autoheight: true,
									borderless: true,
									headerRowHeight: 24,
									rowHeight: 27,
									scroll: "y",
									subview: function (obj, target) {
										var subViewSearchValue = ""

										return webix.ui({
											padding: {
												left: 40, right: 13, top: 0, bottom: 0
											},
											autoheight: true,
											rows: [
												{
													view: "toolbar",
													borderless: true,
													elements: [
														{
															view: "richselect", options: ["S3 Credentials", "Groups"], width: 200, value: "S3 Credentials", on: {
																onChange: function (newv, oldv) {
																	// set search value to empty
																	var search = this.getParentView().getChildViews()[4]
																	search.setValue("")

																	var groupTable = this.getParentView().getParentView().getChildViews()[1]
																	var s3Table = this.getParentView().getParentView().getChildViews()[2]

																	var noGroupAlert = this.getParentView().getParentView().getChildViews()[3].getChildViews()[1]
																	var noS3CredAlert = this.getParentView().getParentView().getChildViews()[3].getChildViews()[2]

																	checkIfAnyObjectIsAssignedToUser(newv, groupTable, s3Table, noGroupAlert, noS3CredAlert)
																	// resize subview
																	$$("usersTable").resizeSubView(obj.id)
																}
															}
														},
														{
															view: "icon", icon: "mdi mdi-plus", css: "icon-button", click: function () {
																baseView.setParam("id", obj.id, false)

																var richeselect = this.getParentView().getChildViews()[0]

																if (richeselect.getValue() == "Groups") {
																	addUserToGroup()
																} else {
																	addS3Credentials()
																}
															}
														},
														{
															view: "icon", icon: "mdi mdi-reload", css: "icon-button", click: function () {
																// set search value to empty
																var search = this.getParentView().getChildViews()[4]
																search.setValue("")
																subViewSearchValue = ""

																var groupTable = this.getParentView().getParentView().getChildViews()[1]
																var s3Table = this.getParentView().getParentView().getChildViews()[2]

																if (groupTable.isVisible()) {
																	groupTable.filterByAll()
																	groupTable.clearAll()
																	groupTable.load("/api/users/assigned-groups/" + obj.id).then(() => {
																		// resize subview
																		$$("usersTable").resizeSubView(obj.id)
																	})
																} else if (s3Table.isVisible()) {
																	s3Table.filterByAll()
																	s3Table.clearAll()
																	s3Table.load("/api/users/" + obj.id + "/s3-credentials").then(() => {
																		// resize subview
																		$$("usersTable").resizeSubView(obj.id)
																	})
																}
															}
														},
														{},
														{
															view: "search",
															width: 250,
															placeholder: "Search",
															on: {
																onTimedKeyPress: function () {
																	var groupTable = this.getParentView().getParentView().getChildViews()[1]
																	var s3Table = this.getParentView().getParentView().getChildViews()[2]

																	if (groupTable.isVisible()) {
																		groupTable.filterByAll()
																	} else if (s3Table.isVisible()) {
																		s3Table.filterByAll()
																	}

																	// resize subview
																	$$("usersTable").resizeSubView(obj.id)
																}
															}
														},
													]
												},
												{
													view: "datatable",
													hidden: true,
													autoheight: true,
													scrollX: true,
													borderless: true,
													headerRowHeight: 24,
													rowHeight: 27,
													scroll: "y",
													columns: [
														{
															id: "group_id", header: "Group ID", adjust: "data", template(data, type, value) {
																return searchColumnTemplateWithSubview(data, type, value, "", subViewSearchValue)
															}
														},
														{
															id: "comment", header: "Comment", fillspace: true, template(data, type, value) {
																return searchColumnTemplateWithSubview(data, type, value, "", subViewSearchValue)
															}
														},
														{
															id: "delete", header: "", width: 70, css: { "text-align": "right" },
															template: function () {
																return `<button type="button" class="hoverButton webix_icon_button">
                                                                        <span class="webix_icon mdi mdi-trash-can"></span>
                                                                    </button>`
															}
														},
													],
													url: "/api/users/assigned-groups/" + obj.id,
													ready: function () {
														// register filter
														var search = this.getParentView().getChildViews()[0].getChildViews()[4]
														this.registerFilter(
															search,
															{
																columnId: "any",
																compare: function (value, filter, item) {
																	filter = filter.toLowerCase()
																	var group_id = item.group_id.toString().toLowerCase()
																	var comment = item.comment.toString().toLowerCase()
																	var any = group_id + comment
																	if (any.indexOf(filter) != -1) {
																		return true
																	}
																	return false
																},
															},
															{
																getValue: function (node) {
																	return node.getValue();
																},
																setValue: function (node, value) {
																	node.setValue(value);
																}
															}
														)
													},
													onClick: {
														hoverButton: function (e, id) {
															if (id.column == "delete") {
																var allData = this.serialize()
																var groups_del = []
																var groups_append = []
																var item = this.getItem(id)

																var groupsTable = this
																webix.confirm({
																	text: "Are you sure you want to delete " + obj.user_id + " from " + item.group_id + "?",
																	callback: function (result) {
																		if (result) {
																			groups_del.push(item.id)
																			allData.forEach(function (element) {
																				if (element.id != item.id) {
																					groups_append.push(element.id)
																				}
																			})

																			var groupsDelAppend = {
																				"groups_del": groups_del,
																				"groups_append": groups_append
																			}

																			webix.ajax().post("/api/group-user-maps-by-user/" + obj.id, JSON.stringify(groupsDelAppend)).then((data) => {
																				var message = data.json()

																				webix.message({
																					text: message,
																					type: "success",
																					expire: 2000
																				})

																				groupsTable.clearAll()
																				groupsTable.load("/api/users/assigned-groups/" + obj.id)

																				$$("usersTable").resizeSubView(obj.id)

																				this.hideWindow()
																			}).fail((xhr) => {
																				ajaxFail(xhr)
																			})
																		}
																	}
																})
															}
														}
													},
													on: {
														onAfterLoad: function () {
															// show alert if no users are assigned to group
															var richselect = this.getParentView().getChildViews()[0].getChildViews()[0]
															var noGroupsAlert = this.getParentView().getChildViews()[3].getChildViews()[1]

															if (richselect.getValue() == "Groups") {
																if (this.count() == 0) {
																	noGroupsAlert.show()
																	this.hide()
																} else {
																	noGroupsAlert.hide()
																	this.show()
																}
															}

															$$("usersTable").resizeSubView(obj.id)
														},
														onBeforeFilter: function (column, value) {
															if (column == "any") {
																subViewSearchValue = value
															}
														}
													}
												},
												{
													view: "datatable",
													autoheight: true,
													hidden: true,
													scrollX: false,
													borderless: true,
													headerRowHeight: 24,
													rowHeight: 27,
													scroll: "y",
													columns: [
														{
															id: "access_key", header: "Access Key", adjust: true, template(data, type, value) {
																return searchColumnTemplateWithSubview(data, type, value, "", subViewSearchValue)
															}
														},
														{
															id: "show", header: "", width: 30, template: function (obj) {
																return `<button type="button" class="hoverButton webix_icon_button">
                                                                    <span class="webix_icon mdi mdi-eye${obj.hidden || obj.hidden == undefined ? "-off" : ""}"></span>
                                                                </button>`
															}
														},
														{
															id: "secret_key", header: "Access Secret Key", fillspace: true, template: function (obj) {
																if (obj.hidden || obj.hidden == undefined) {
																	return obj.secret_key.replace(/./g, '●');
																} else {
																	return obj.secret_key
																}
															}
														},
														{
															id: "delete", header: "", width: 70, css: { "text-align": "right" },
															template: function () {
																return `<button type="button" class="hoverButton webix_icon_button">
                                                                        <span class="webix_icon mdi mdi-trash-can"></span>
                                                                    </button>`
															}
														},
													],
													url: "/api/users/" + obj.id + "/s3-credentials",
													ready: function () {
														// register filter
														var search = this.getParentView().getChildViews()[0].getChildViews()[4]
														this.registerFilter(
															search,
															{
																columnId: "any",
																compare: function (value, filter, item) {
																	filter = filter.toLowerCase()
																	var access_key = item.access_key.toString().toLowerCase()
																	if (access_key.indexOf(filter) != -1) {
																		return true
																	}
																	return false
																},
															},
															{
																getValue: function (node) {
																	return node.getValue();
																},
																setValue: function (node, value) {
																	node.setValue(value);
																}
															}
														)
													},
													onClick: {
														hoverButton: function (e, id) {
															if (id.column == "show") {
																var item = this.getItem(id)
																item.hidden == undefined ? item.hidden = false : item.hidden = !item.hidden
																this.updateItem(id, item)
															} else if (id.column == "delete") {
																var item = this.getItem(id)

																var s3Table = this
																webix.confirm({
																	text: "Are you sure you want to delete this S3 Credential?",
																	callback: function (result) {
																		if (result) {
																			var s3_credential_json = {
																				"access_key": item.access_key,
																				"secret_key": item.secret_key
																			}

																			webix.ajax().del("/api/users/" + obj.id + "/s3-credentials", JSON.stringify(s3_credential_json)).then(function (data) {
																				webix.message("S3 Credential deleted")

																				s3Table.clearAll()
																				s3Table.load("/api/users/" + obj.id + "/s3-credentials")

																				$$("usersTable").resizeSubView(obj.id)
																			}).fail((xhr) => {
																				ajaxFail(xhr)
																			})
																		}
																	}
																})
															}
														}
													},
													on: {
														onAfterLoad: function () {
															// show alert if no s3 credentials are assigned to group
															var richselect = this.getParentView().getChildViews()[0].getChildViews()[0]

															var noS3CredAlert = this.getParentView().getChildViews()[3].getChildViews()[2]
															if (richselect.getValue() == "S3 Credentials") {
																if (this.count() == 0) {
																	noS3CredAlert.show()
																	this.hide()
																} else {
																	noS3CredAlert.hide()
																	this.show()
																}
															}

															$$("usersTable").resizeSubView(obj.id)
														},
														onBeforeFilter: function (column, value) {
															if (column == "any") {
																subViewSearchValue = value
															}
														},
													}
												},
												{
													borderless: true,
													cols: [
														{},
														{
															view: "label", label: 'The user is not assigned to any group', align: "center", inputWidth: "auto", hidden: true,
														},
														{
															view: "label", label: 'No S3 credentials are assigned to the user', align: "center", inputWidth: "auto", hidden: true
														},
														{}
													]
												},
											]
										}, target);
									},
									columns: [
										{ id: "subrow", header: "", template: "{common.subrow()}", adjust: "data" },
										{
											id: "user_id", header: "User ID", adjust: "data", template(data, type, value) {
												return searchColumnTemplateWithSubview(data, type, value, mainSearchValue, "")
											}
										},
										{
											id: "name", header: "Name", adjust: "data", template(data, type, value) {
												return searchColumnTemplateWithSubview(data, type, value, mainSearchValue, "")
											}
										},
										{
											id: "email", header: "Email", adjust: "data", template(data, type, value) {
												return searchColumnTemplateWithSubview(data, type, value, mainSearchValue, "")
											}
										},
										{
											id: "comment", header: "Comment", fillspace: true, template(data, type, value) {
												return searchColumnTemplateWithSubview(data, type, value, mainSearchValue, "")
											}
										},
										{
											id: "settings", header: "", adjust: "data",
											template: function () {
												return `<button type="button" class="hoverButton webix_icon_button">
                                                        <span class="webix_icon mdi mdi-wrench"></span>
                                                    </button>`
											}
										},
									],
									onClick: {
										hoverButton: (e, id, target) => {
											var item = $$("usersTable").getItem(id)
											this.setParam("id", item.id, false)
											$$("user_settings_menu").show(target)
										}
									},
									on: {
										onBeforeFilter: function (column, value) {
											if (column == "any") {
												mainSearchValue = value
											}
										},
										onSubViewCreate: function (view, item) {
											// resize the subview when the data is loaded
											var s3CredentialsDatatable = view.getChildViews()[2]

											s3CredentialsDatatable.waitData.then(() => {
												this.resizeSubView(item.id)
											})
										},
										onAfterLoad: function () {
											// show alert if no users are found
											var noUsersFoundAlert = this.getParentView().getChildViews()[2].getChildViews()[0]
											if (this.count() == 0) {
												noUsersFoundAlert.show()
												this.hide()
											} else {
												noUsersFoundAlert.hide()
												this.show()
											}
										}

									},
									url: "/api/users",
								},
								{
									view: "toolbar", borderless: true, elements: [
										{
											view: "label", label: 'No users found', align: "center", inputWidth: "auto", hidden: true, css: "header_label"
										}
									]
								}
							]
						}
					],
				},
			]
		}
	}
	init() {
		this.ui(UserSettingsMenu)
		addUserWindow = this.ui(AddUserWindow)
		addUserToGroupWindow = $$("user_to_group_window")
		addS3CredentialsWindow = $$("add_s3_credentials_window")

	}
	ready() {
		$$("usersTable").registerFilter(
			$$("userTabMainSearch"),
			{
				columnId: "any",
				compare: function (value, filter, item) {
					filter = filter.toLowerCase()
					var user_id = item.user_id.toString().toLowerCase()
					var name = item.name.toString().toLowerCase()
					var email = item.email.toString().toLowerCase()
					var comment = item.comment.toString().toLowerCase()
					var any = user_id + name + email + comment
					if (any.indexOf(filter) != -1) {
						return true
					}
					return false
				},
			},
			{
				getValue: function (node) {
					return node.getValue();
				},
				setValue: function (node, value) {
					node.setValue(value);
				}
			}
		)

		$$("usersRichselect").getList().disableItem("Remote Users")
	}
	addUser() {
		addUserWindow.showWindow()
	}
	addUserToGroup() {
		addUserToGroupWindow.show()
	}
	addS3Credentials() {
		addS3CredentialsWindow.show()
	}
}