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
import CHAPSettingsMenu from "./context menus/chapSettingsMenu";
import AddCHAPUserWindow from "./windows/addChapUser";

import { searchColumnTemplate } from "../../../functions/searchTemplate";

var addChapUserWindow
export default class ChapAuthenticationTab extends JetView {
	config() {
		var addChapUser = this.addChapUser

		var mainSearchValue = ""

		return {
			id: "chap_authentication",
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
											view: "icon", icon: "mdi mdi-plus", css: "icon-button", click: () => {
												this.setParam("id", "", false)
												addChapUser()
											}
										},
										{
											view: "icon", icon: "mdi mdi-reload", css: "icon-button", click: () => {
												$$("chapUsersTable").clearAll()
												$$("chapUsersTable").load("/api/chap-users")

												mainSearchValue = ""
												$$("chapTabMainSearch").setValue("")
											}
										},
										{},
										{
											view: "search", width: 250, placeholder: "Search", id: "chapTabMainSearch",
											on: {
												onTimedKeyPress: () => {
													$$("chapUsersTable").filterByAll()
												}
											}
										},
										{ width: 8 }
									]
								},
								{
									view: "datatable",
									id: "chapUsersTable",
									autoheight: true,
									borderless: true,
									headerRowHeight: 24,
									rowHeight: 27,
									scroll: "y",
									columns: [
										{ id: "separator", header: "", width: 10 },
										{
											id: "chap_name", header: "CHAP ID", adjust: true, template(data, type, value) {
												return searchColumnTemplate(value, mainSearchValue)
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
											id: "password", header: "Password", fillspace: true, template: function (obj) {
												if (obj.hidden || obj.hidden == undefined) {
													return obj.password.replace(/./g, '●');
												} else {
													return obj.password
												}
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
									url: "/api/chap-users",
									onClick: {
										hoverButton: function (e, id, target) {
											if (id.column == "show") {
												var item = this.getItem(id)
												item.hidden == undefined ? item.hidden = false : item.hidden = !item.hidden
												this.updateItem(id, item)
											} else if (id.column == "settings") {
												var item = $$("chapUsersTable").getItem(id)
												this.setParam("id", item.id, false)
												$$("chap_user_settings_menu").show(target)
											}
										}
									},
									on: {
										onBeforeFilter: function (column, value) {
											if (column == "any") {
												mainSearchValue = value
											}
										},
										onAfterLoad: function () {
											// show alert if no users are found
											var noChapUsersFoundAlert = this.getParentView().getChildViews()[2].getChildViews()[0]
											if (this.count() == 0) {
												noChapUsersFoundAlert.show()
												this.hide()
											} else {
												noChapUsersFoundAlert.hide()
												this.show()
											}
										}
									}
								},
								{
									view: "toolbar", borderless: true, elements: [
										{
											view: "label", label: 'No CHAP users found', align: "center", inputWidth: "auto", hidden: true, css: "header_label"
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
		this.ui(CHAPSettingsMenu)
		addChapUserWindow = this.ui(AddCHAPUserWindow)
	}
	ready() {
		$$("chapUsersTable").registerFilter(
			$$("chapTabMainSearch"),
			{
				columnId: "any",
				compare: function (value, filter, item) {
					filter = filter.toLowerCase();
					return item.chap_name.toLowerCase().indexOf(filter) !== -1;
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
	}
	addChapUser() {
		addChapUserWindow.showWindow()
	}
}