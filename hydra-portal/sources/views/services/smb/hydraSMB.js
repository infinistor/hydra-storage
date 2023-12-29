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
import SMBAccordion from "./smbAccordion.js";
import AddGroup from "./windows/addGroup.js";
import AddUser from "./windows/addUser.js";
import AddShare from "./windows/addShareWindow.js";
import SMBContextMenu from "./context menu/smbContextMenu.js";

import { searchColumnTemplateWithSubview } from "../../../functions/searchTemplate";
import { ajaxFail } from "../../../functions/ajaxFail.js";

var addGroupWindow
var addUserWindow
var addShareWindow
export default class HydraSMB extends JetView {
	config() {
		var baseView = this

		var addGroup = this.addGroup
		var addUser = this.addUser
		var addShare = this.addShare

		var mainSearchValue = ""

		function checkIfAnyObjectsAssigned(object, guestOk, groupsDatatable, usersDatatable, noGroupsAlert, noUsersAlert) {
			if (object == "Groups") {
				if (guestOk) {
					groupsDatatable.hide()
					noGroupsAlert.hide()
				} else {
					if (groupsDatatable.count() == 0) {
						groupsDatatable.hide()
						noGroupsAlert.show()
					} else {
						groupsDatatable.show()
						noGroupsAlert.hide()
					}
				}

				usersDatatable.hide()
				noUsersAlert.hide()

				groupsDatatable.filterByAll()
			} else {
				if (guestOk) {
					usersDatatable.hide()
					noUsersAlert.hide()
				} else {
					if (usersDatatable.count() == 0) {
						usersDatatable.hide()
						noUsersAlert.show()
					} else {
						usersDatatable.show()
						noUsersAlert.hide()
					}
				}

				groupsDatatable.hide()
				noGroupsAlert.hide()

				usersDatatable.filterByAll()
			}
		}

		return {
			id: "hydraSMB",
			borderless: true,
			rows: [
				{ height: 15 },
				{
					type: "line", paddingX: 15,
					rows: [
						{
							header: "SMB Service & Global Configuration", id: "share_config", borderless: true, collapsed: true, body: SMBAccordion,
						},
						{ height: 15 },
						{
							rows: [
								{
									view: "toolbar",
									// css: "bottomline",
									borderless: true,
									elements: [
										{ width: 3 },
										{ view: "label", label: "Shares", css: "header_label" }
									]
								},
								{
									view: "toolbar",
									// css: "bottomline",
									borderless: true,
									elements: [
										{
											view: "icon", icon: "mdi mdi-plus", css: "icon-button", click: () => {
												baseView.setParam("id", "", false)
												addShare()
											}
										},
										{
											view: "icon", icon: "mdi mdi-reload", css: "icon-button", click: () => {
												$$("share_datatable").clearAll()
												$$("share_datatable").load("/api/smb/shares")

												$$("share_datatable").filterByAll()

												mainSearchValue = ""
												$$("mainShareSearch").setValue("")
											}
										},
										{},
										{
											view: "search", width: 250, placeholder: "Search", id: "mainShareSearch", on: {
												onTimedKeyPress: function () {
													$$("share_datatable").filterByAll()
												}
											}
										},
									]
								},
								{
									view: "datatable",
									id: "share_datatable",
									autoheight: true,
									borderless: true,
									headerRowHeight: 24,
									minRowHeight: 27,
									scroll: "y",
									subview: function (obj, target) {
										// if guest access is enabled, hide all elements and only show the message alerting the user that 
										// when guest access is enabled, all users have access to the share
										var guestOk = false
										if (obj.guest_access == 'y') guestOk = true

										var readOnly = false
										if (obj.writable == 'n') readOnly = true

										var subViewSearchValue = ""

										return webix.ui({
											padding: {
												left: 40, right: 0, top: 0, bottom: 0
											},
											rows: [
												{
													view: "toolbar",
													borderless: true,
													hidden: guestOk,
													elements: [
														{
															view: "richselect", options: ["Groups", "Users"], value: "Groups", width: 100, on: {
																onChange: function (newv, oldv) {
																	var search = this.getParentView().getChildViews()[6]
																	search.setValue("")

																	var groupsDatatable = this.getParentView().getParentView().getChildViews()[1]
																	var usersDatatable = this.getParentView().getParentView().getChildViews()[2]

																	var noGroupsAlert = this.getParentView().getParentView().getChildViews()[3].getChildViews()[2]
																	var noUsersAlert = this.getParentView().getParentView().getChildViews()[3].getChildViews()[3]

																	checkIfAnyObjectsAssigned(newv, guestOk, groupsDatatable, usersDatatable, noGroupsAlert, noUsersAlert)

																	$$("share_datatable").resizeSubView(obj.id)
																}
															}
														},
														{ view: "richselect", options: ["Local", "Remote"], value: "Local", width: 100 },
														{
															view: "icon", icon: "mdi mdi-plus", css: "icon-button", click: function () {
																var richeselect = this.getParentView().getChildViews()[0]

																baseView.setParam("id", obj.id, false)
																baseView.setParam("readonly", obj.writable == 'y' ? false : true, false)

																if (richeselect.getValue() == "Groups") {
																	addGroup()
																} else {
																	addUser()
																}
															}
														},
														{
															view: "icon", icon: "mdi mdi-reload", css: "icon-button", click: function () {
																var groupsDatatable = this.getParentView().getParentView().getChildViews()[1]
																var usersDatatable = this.getParentView().getParentView().getChildViews()[2]

																var richeselect = this.getParentView().getChildViews()[0]

																if (richeselect.getValue() == "Groups") {
																	groupsDatatable.clearAll()
																	groupsDatatable.load("/api/smb/shares/" + obj.id + "/groups").then(function () {
																		$$("share_datatable").resizeSubView(obj.id)
																	})
																} else {
																	usersDatatable.clearAll()
																	usersDatatable.load("/api/smb/shares/" + obj.id + "/users").then(function () {
																		$$("share_datatable").resizeSubView(obj.id)
																	})
																}

																subViewSearchValue = ""
																var search = this.getParentView().getChildViews()[6]
																search.setValue("")
															}
														},
														{
															view: "icon", icon: "mdi mdi-check", css: "icon-button check-button", hidden: true, click: function () {
																var _self = this
																var richeselect = this.getParentView().getChildViews()[0]
																if (richeselect.getValue() == "Groups") {
																	var groupsDatatable = this.getParentView().getParentView().getChildViews()[1]

																	var json_groups = []

																	groupsDatatable.serialize().forEach((item) => {
																		if (item.readwrite) {
																			json_groups.push({ comment: item.comment, group_name: item.group_name, group_id: item.group_id, permission: "w" })
																		} else if (item.readonly) {
																			json_groups.push({ comment: item.comment, group_name: item.group_name, group_id: item.group_id, permission: "r" })
																		}
																	})

																	webix.ajax().put("/api/smb/shares/" + obj.id + "/groups", JSON.stringify(json_groups)).then(function (data) {
																		groupsDatatable.clearAll()
																		groupsDatatable.load("/api/smb/shares/" + obj.id + "/groups")

																		// success message
																		webix.message({
																			type: "success",
																			text: data.json(),
																			expire: 2000,
																		})

																		_self.hide()
																	}).fail((xhr) => {
																		ajaxFail(xhr)
																	})
																} else {
																	var usersDatatable = this.getParentView().getParentView().getChildViews()[2]

																	var json_users = []

																	usersDatatable.serialize().forEach((item) => {
																		if (item.readwrite) {
																			json_users.push({ comment: item.comment, user_name: item.user_name, user_id: item.user_id, permission: "w" })
																		} else if (item.readonly) {
																			json_users.push({ comment: item.comment, user_name: item.user_name, user_id: item.user_id, permission: "r" })
																		}
																	})

																	webix.ajax().put("/api/smb/shares/" + obj.id + "/users", JSON.stringify(json_users)).then(function (data) {
																		usersDatatable.clearAll()
																		usersDatatable.load("/api/smb/shares/" + obj.id + "/users")

																		// success message
																		webix.message({
																			type: "success",
																			text: data.json(),
																			expire: 2000,
																		})

																		_self.hide()
																	}).fail((xhr) => {
																		ajaxFail(xhr)
																	})
																}

																$$("share_datatable").resizeSubView(obj.id)
															}
														},
														{},
														{
															view: "search",
															width: 250,
															placeholder: "Search",
															height: 29,
															on: {
																onTimedKeyPress: function () {
																	var groupsTable = this.getParentView().getParentView().getChildViews()[1]
																	var usersTable = this.getParentView().getParentView().getChildViews()[2]

																	if (groupsTable.isVisible()) {
																		groupsTable.filterByAll()
																	} else if (usersTable.isVisible()) {
																		usersTable.filterByAll()
																	}

																	$$("share_datatable").resizeSubView(obj.id)
																}
															}
														},
													]
												},
												{
													view: "datatable",
													headerRowHeight: 24,
													minRowHeight: 27,
													autoheight: true,
													borderless: true,
													hidden: true,
													scroll: "y",
													columns: [
														{
															id: "group_name", header: "Group ID", adjust: true, template(data, type, value) {
																return searchColumnTemplateWithSubview(data, type, value, "", subViewSearchValue)
															}
														},
														{
															id: "comment", header: "Comment", fillspace: true, template(data, type, value) {
																return searchColumnTemplateWithSubview(data, type, value, "", subViewSearchValue)
															}
														},
														{
															id: "readwrite", header: "Read / Write", adjust: "header", template: (obj) => {
																if (readOnly)
																	return "<input disabled class='webix_table_checkbox' type='checkbox'>"
																else return `<input class='webix_table_checkbox' type='checkbox'${obj.readwrite == true ? " checked = 'true'" : ""}>`
															}, css: "checkboxCenter"
														},
														{
															id: "readonly", header: "Read Only", template: (obj) => {
																return `<input class='webix_table_checkbox' type='checkbox'${obj.readonly == true ? " checked = 'true'" : ""}>`
															}, adjust: "header", css: "checkboxCenter"
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
													url: "/api/smb/shares/" + obj.id + "/groups",
													onClick: {
														"hoverButton": function (e, id, trg) {
															var item = this.getItem(id)

															var groupsTable = this
															webix.confirm({
																text: "Are you sure you want to delete this group?",
																ok: "Yes", cancel: "Cancel",
																callback: function (result) {
																	if (result) {
																		webix.ajax().del("/api/smb/shares/" + obj.id + "/groups/" + item.group_id).then(function (data) {
																			groupsTable.clearAll()
																			groupsTable.load("/api/smb/shares/" + obj.id + "/groups")

																			$$("share_datatable").resizeSubView(obj.id)

																			webix.message({
																				type: "success",
																				text: data.json(),
																				expire: 2000,
																			})

																			this.hideWindow()
																		}).fail((xhr) => {
																			ajaxFail(xhr)
																		})
																	}
																}
															})
														}
													},
													ready: function () {
														var search = this.getParentView().getChildViews()[0].getChildViews()[6]
														this.registerFilter(
															search,
															{
																columnId: "any",
																compare: function (value, filter, item) {
																	filter = filter.toLowerCase()
																	var group_id = item.group_name.toString().toLowerCase()
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
													on: {
														onCheck: function (rowId, columnId, state) {
															var applyButton = this.getParentView().getChildViews()[0].getChildViews()[4]
															applyButton.show()

															if (!state) {
																if (columnId == "readwrite") {
																	this.updateItem(rowId, { readwrite: 0 })
																} else if (columnId == "readonly") {
																	this.updateItem(rowId, { readonly: 0 })
																}
															} else {
																if (columnId == "readwrite") {
																	this.updateItem(rowId, { readonly: 0, readwrite: 1 })
																} else if (columnId == "readonly") {
																	this.updateItem(rowId, { readwrite: 0, readonly: 1 })
																}
															}
														},
														onAfterLoad: function () {
															var richselect = this.getParentView().getChildViews()[0].getChildViews()[0]

															// show no groups alert if no groups are assigned
															var groupsDatatable = this
															var usersDatatable = this.getParentView().getChildViews()[2]

															var noGroupsAlert = this.getParentView().getChildViews()[3].getChildViews()[2]
															var noUsersAlert = this.getParentView().getChildViews()[3].getChildViews()[3]

															checkIfAnyObjectsAssigned(richselect.getValue(), guestOk, groupsDatatable, usersDatatable, noGroupsAlert, noUsersAlert)

															$$("share_datatable").resizeSubView(obj.id)

															this.serialize().forEach((item) => {
																if (item.permission == 'r') {
																	this.updateItem(item.id, { readonly: 1, readwrite: 0 })
																} else {
																	this.updateItem(item.id, { readonly: 0, readwrite: 1 })
																}
															})
														},
														onBeforeFilter(column, value) {
															if (column == "any") {
																subViewSearchValue = value
															}
														}
													}
												},
												{
													view: "datatable",
													hidden: true,
													headerRowHeight: 24,
													minRowHeight: 27,
													autoheight: true,
													borderless: true,
													scroll: "y",
													columns: [
														{
															id: "user_name", header: "User ID", adjust: true, template(data, type, value) {
																return searchColumnTemplateWithSubview(data, type, value, "", subViewSearchValue)
															}
														},
														{
															id: "comment", header: "Comment", fillspace: true, template(data, type, value) {
																return searchColumnTemplateWithSubview(data, type, value, "", subViewSearchValue)
															}
														},
														{
															id: "readwrite", header: "Read / Write", adjust: "header", template: (obj) => {
																if (readOnly)
																	return "<input disabled class='webix_table_checkbox' type='checkbox'>"
																else return `<input class='webix_table_checkbox' type='checkbox'${obj.readwrite == true ? " checked = 'true'" : ""}>`
															}, css: "checkboxCenter"
														},
														{
															id: "readonly", header: " Read Only", template: (obj) => {
																return `<input class='webix_table_checkbox' type='checkbox'${obj.readonly == true ? " checked = 'true'" : ""}>`
															}, adjust: "header", css: "checkboxCenter"
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
													url: "/api/smb/shares/" + obj.id + "/users",
													ready: function () {
														var search = this.getParentView().getChildViews()[0].getChildViews()[6]
														this.registerFilter(
															search,
															{
																columnId: "any",
																compare: function (value, filter, item) {
																	filter = filter.toLowerCase()
																	var user_id = item.user_name.toString().toLowerCase()
																	var comment = item.comment.toString().toLowerCase()
																	var any = user_id + comment
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
														"hoverButton": function (e, id, trg) {
															var item = this.getItem(id)

															var usersTable = this
															webix.confirm({
																text: "Are you sure you want to delete this user?",
																ok: "Yes", cancel: "Cancel",
																callback: function (result) {
																	if (result) {
																		webix.ajax().del("/api/smb/shares/" + obj.id + "/users/" + item.user_id).then(function (data) {
																			usersTable.clearAll()
																			usersTable.load("/api/smb/shares/" + obj.id + "/users")

																			$$("share_datatable").resizeSubView(obj.id)

																			webix.message({
																				type: "success",
																				text: data.json(),
																				expire: 2000
																			})

																			this.hideWindow()
																		}).fail((xhr) => {
																			ajaxFail(xhr)
																		})
																	}
																}
															})
														}
													},
													on: {
														onCheck: function (rowId, columnId, state) {
															var applyButton = this.getParentView().getChildViews()[0].getChildViews()[4]
															applyButton.show()

															if (!state) {
																if (columnId == "readwrite") {
																	this.updateItem(rowId, { readwrite: 0 })
																} else if (columnId == "readonly") {
																	this.updateItem(rowId, { readonly: 0 })
																}
															} else {
																if (columnId == "readwrite") {
																	this.updateItem(rowId, { readonly: 0, readwrite: 1 })
																} else if (columnId == "readonly") {
																	this.updateItem(rowId, { readwrite: 0, readonly: 1 })
																}
															}
														},
														onAfterLoad: function () {
															var richselect = this.getParentView().getChildViews()[0].getChildViews()[0]

															// show no groups alert if no groups are assigned
															var groupsDatatable = this.getParentView().getChildViews()[1]
															var usersDatatable = this

															var noGroupsAlert = this.getParentView().getChildViews()[3].getChildViews()[2]
															var noUsersAlert = this.getParentView().getChildViews()[3].getChildViews()[3]

															checkIfAnyObjectsAssigned(richselect.getValue(), guestOk, groupsDatatable, usersDatatable, noGroupsAlert, noUsersAlert)

															$$("share_datatable").resizeSubView(obj.id)

															this.serialize().forEach((item) => {
																if (item.permission == 'r') {
																	this.updateItem(item.id, { readonly: 1, readwrite: 0 })
																} else {
																	this.updateItem(item.id, { readwrite: 1, readonly: 0 })
																}
															})
														},
														onBeforeFilter(column, value) {
															if (column == "any") {
																subViewSearchValue = value
															}
														}
													}
												},
												{
													cols: [
														{},
														{
															view: "label", label: 'When "guest access" is enabled, all users and groups can access the share', align: "center", inputWidth: "auto", hidden: !guestOk
														},
														{
															view: "label", label: 'No group assigned to the share', align: "center", inputWidth: "auto", hidden: true,
														},
														{
															view: "label", label: 'No user assigned to the share', align: "center", inputWidth: "auto", hidden: true
														},
														{}
													]
												},
											]
										}, target);
									},
									columns: [
										{ id: "subrow", header: "", template: "{common.subrow()}", adjust: true, },
										{
											id: "enable", header: "Enable", adjust: "header",
											template: function (obj) {
												var color = obj.enable == 'y' ? "#1CA1C1" : "#D9D9D9";
												return `<span style="font-size: 25px; color: ${color}; line-height: 31px;" class="webix_icon switcher mdi mdi-toggle-switch${obj.enable == 'y' ? "" : "-off"}"></span>`
											}
										},
										{
											id: "share_name", header: "Share ID", adjust: "data", template(data, type, value) {
												return searchColumnTemplateWithSubview(data, type, value, mainSearchValue, "")
											}
										},
										{
											id: "dataset_path", header: "Filesystem (or Dataset)", adjust: true, template(data, type, value) {
												return searchColumnTemplateWithSubview(data, type, value, mainSearchValue, "")
											}
										},
										{
											id: "guest_access", header: "Guest Access", adjust: "header", template: (obj) => {
												return obj.guest_access == "y" ? "Yes" : "No"
											}
										},
										{
											id: "writable", header: "Read Only", adjust: true, template: (obj) => {
												return obj.writable == "y" ? "No" : "Yes"
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
									url: "/api/smb/shares",
									onClick: {
										switcher: function (e, id) {
											webix.ajax().put("/api/smb/shares/" + id + "/toggle").then(() => {
												var obj = this.getItem(id);
												var newEnable = obj.enable == 'y' ? 'n' : 'y';
												this.updateItem(id, { enable: newEnable });
											}).fail((xhr) => {
												ajaxFail(xhr)
											})
										},
										hoverButton: (e, id, target) => {
											var item = $$("share_datatable").getItem(id)
											baseView.setParam("id", item.id, false)
											$$("smb_context_menu").show(target)
										}
									},
									on: {
										onSubViewCreate: function (view, item) {
											// resize the subview when the data is loaded
											var groupsDatatable = view.getChildViews()[1]

											groupsDatatable.waitData.then(() => {
												this.resizeSubView(item.id)
											})
										},
										onBeforeFilter(column, value) {
											if (column == "any") {
												mainSearchValue = value
											}
										},
										onAfterLoad: function () {
											if (this.count() == 0) {
												this.hide()
												$$("noSharesLabel").show()
											} else {
												this.show()
												$$("noSharesLabel").hide()
											}
										}
									}
								},
								{
									view: "toolbar",
									borderless: true,
									hidden: true,
									id: "noSharesLabel",
									elements: [
										{
											view: "label", label: "No shares found", align: "center", inputWidth: "auto", css: "header_label"
										},
									]
								}
							]
						}
					]
				},
			]
		}
	}
	init() {
		addGroupWindow = this.ui(AddGroup)
		addUserWindow = this.ui(AddUser)
		addShareWindow = this.ui(AddShare)
		this.ui(SMBContextMenu)

		$$("share_datatable").registerFilter(
			$$("mainShareSearch"),
			{
				columnId: "any", compare: function (value, filter, item) {
					var share_id = item.share_name.toLowerCase()
					var dataset_path = item.dataset_path.toLowerCase()
					var comment = item.comment.toLowerCase()
					var any = share_id + dataset_path + comment
					return any.indexOf(filter.toLowerCase()) !== -1;
				}
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

		// check if the page was redirected from the dashboard page
		var source = webix.storage.local.get("source")
		if (source == "dashboard") {
			webix.storage.local.remove("source")
			// expand share_config
			$$("share_config").expand()
		}
	}
	addGroup() {
		addGroupWindow.showWindow()
	}
	addUser() {
		addUserWindow.showWindow()
	}
	addShare() {
		addShareWindow.showWindow()
	}
}