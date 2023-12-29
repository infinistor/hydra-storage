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
import GroupSettingsMenu from "./context menus/groupSettingsMenu";
import AddGroupWindow from "./windows/addGroupWindow";

import { searchColumnTemplateWithSubview } from "../../../functions/searchTemplate";
import { ajaxFail } from "../../../functions/ajaxFail";

var addGroupWindow
export default class GroupTab extends JetView {
	config() {
		var addGroup = this.addGroup
		var baseView = this

		var mainSearchValue = ""
		return {
			id: "groups",
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
									height: 35,
									borderless: true,
									elements: [
										{ width: 8 },
										{
											view: "richselect", id: "groupsRichselect", options: ["Local Groups", "Remote Groups"], value: "Local Groups", width: 200, on: {
												onChange: function (newv, oldv) {
													// if "Remote Groups" is selected, prevent it and set it back to "Local Groups"
													if (newv == "Remote Groups") {
														this.setValue("Local Groups")
													}
												}
											}
										},
										{
											view: "icon", icon: "mdi mdi-plus", css: "icon-button", click: () => {
												this.setParam("id", "", false)
												addGroup()
											}
										},
										{
											view: "icon", icon: "mdi mdi-reload", css: "icon-button", click: () => {
												$$("groupsTable").clearAll()
												$$("groupsTable").load("/api/groups")

												mainSearchValue = ""
												$$("groupsTabMainSearch").setValue("")
											}
										},
										{},
										{
											view: "search", width: 250, placeholder: "Search", id: "groupsTabMainSearch",
											on: {
												onTimedKeyPress: function () {
													$$("groupsTable").filterByAll()
												}
											}
										},
										{ width: 8 }
									]
								},
								{
									view: "datatable",
									id: "groupsTable",
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
													autoheight: true,
													height: 35,
													borderless: true,
													elements: [
														{
															view: "icon", icon: "mdi mdi-plus", css: "icon-button", click: () => {
																baseView.setParam("id", obj.id, false)
																$$("group_to_user_window").show()
															}
														},
														{
															view: "icon", icon: "mdi mdi-reload", css: "icon-button", click: function () {
																var userDatatable = this.getParentView().getParentView().getChildViews()[1]
																userDatatable.clearAll()
																userDatatable.load("/api/groups/assigned-users/" + obj.id).then(() => {
																	$$("groupsTable").resizeSubView(obj.id)
																})

																subViewSearchValue = ""
																var search = this.getParentView().getChildViews()[3]
																search.setValue("")
															}
														},
														{},
														{
															view: "search",
															width: 250,
															placeholder: "Search",
															on: {
																onTimedKeyPress: function () {
																	var userDatatable = this.getParentView().getParentView().getChildViews()[1]
																	userDatatable.filterByAll()

																	$$("groupsTable").resizeSubView(obj.id)
																}
															}
														},
													]
												},
												{
													view: "datatable",
													autoheight: true,
													borderless: true,
													headerRowHeight: 24,
													rowHeight: 27,
													hidden: true,
													scroll: "y",
													columns: [
														{
															id: "user_id", header: "User ID", adjust: true, template(data, type, value) {
																return searchColumnTemplateWithSubview(data, type, value, "", subViewSearchValue)
															}
														},
														{
															id: "name", header: "Name", adjust: true, template(data, type, value) {
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
													url: "/api/groups/assigned-users/" + obj.id,
													ready: function () {
														var search = this.getParentView().getChildViews()[0].getChildViews()[3]
														this.registerFilter(
															search,
															{
																columnId: "any",
																compare: function (value, filter, item) {
																	filter = filter.toLowerCase();
																	var user_id = item.user_id.toLowerCase();
																	var name = item.name.toLowerCase();
																	var comment = item.comment.toLowerCase();
																	var any = user_id + name + comment;
																	return any.indexOf(filter) !== -1;
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
													},
													onClick: {
														hoverButton: function (e, id) {
															var allData = this.serialize()
															var users_del = []
															var users_append = []
															var item = this.getItem(id)

															var usersTable = this
															webix.confirm({
																text: "Are you sure you want to delete " + item.user_id + " from " + obj.group_id + "?",
																callback: function (result) {
																	if (result) {
																		users_del.push(item.id)
																		allData.forEach(function (element) {
																			if (element.id != item.id) {
																				users_append.push(element.id)
																			}
																		})

																		var usersDelAppend = {
																			"users_del": users_del,
																			"users_append": users_append
																		}

																		webix.ajax().post("/api/group-user-maps-by-group/" + obj.id, JSON.stringify(usersDelAppend)).then((data) => {
																			var message = data.json()

																			webix.message({
																				text: message,
																				type: "success",
																				expire: 2000,
																			})

																			usersTable.clearAll()
																			usersTable.load("/api/groups/assigned-users/" + obj.id)

																			$$("groupsTable").resizeSubView(obj.id)

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
														onAfterLoad: function () {
															var noUsersAlert = this.getParentView().getChildViews()[2].getChildViews()[1]

															if (this.count() == 0) {
																this.hide()
																noUsersAlert.show()
															} else {
																this.show()
																noUsersAlert.hide()
															}

															$$("groupsTable").resizeSubView(obj.id)
														},
														onBeforeFilter: function (column, value) {
															if (column == "any") {
																subViewSearchValue = value
															}
														}
													}
												},
												{
													padding: 0,
													borderless: true,
													cols: [
														{},
														{ view: "label", label: 'No users are assigned to this group', align: "center", inputWidth: "auto", hidden: true },
														{}
													],
												}
											]
										}, target);
									},
									columns: [
										{ id: "subrow", header: "", template: "{common.subrow()}", adjust: "data" },
										{
											id: "group_id", header: "Group ID", adjust: "data", template(data, type, value) {
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
											var item = this.$$("groupsTable").getItem(id)
											this.setParam("id", item.id, false)
											$$("group_settings_menu").show(target)
										}
									},
									url: "/api/groups",
									on: {
										onBeforeFilter: function (column, value) {
											if (column == "any") {
												mainSearchValue = value
											}
										},
										onSubViewCreate: function (view, item) {
											var usersDatatable = view.getChildViews()[1]

											usersDatatable.waitData.then(() => {
												this.resizeSubView(item.id)
											})
										},
										onAfterLoad: function () {
											// show alert if no users are found
											var noGroupsFoundAlert = this.getParentView().getChildViews()[2].getChildViews()[0]
											if (this.count() == 0) {
												noGroupsFoundAlert.show()
												this.hide()
											} else {
												noGroupsFoundAlert.hide()
												this.show()
											}
										}
									}
								},
								{
									view: "toolbar", borderless: true, elements: [
										{
											view: "label", label: 'No groups found', align: "center", inputWidth: "auto", hidden: true, css: "header_label"
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
		this.ui(GroupSettingsMenu)
		addGroupWindow = this.ui(AddGroupWindow)
	}
	ready() {
		$$("groupsTable").registerFilter(
			$$("groupsTabMainSearch"),
			{
				columnId: "any",
				compare: function (value, filter, item) {
					filter = filter.toLowerCase()
					var group_id = item.group_id.toLowerCase()
					var comment = item.comment.toLowerCase()
					var any = group_id + comment
					if (any.indexOf(filter) != -1) {
						return true
					}
					return false
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

		$$("groupsRichselect").getList().disableItem("Remote Groups")
	}
	addGroup() {
		addGroupWindow.showWindow()
	}
}