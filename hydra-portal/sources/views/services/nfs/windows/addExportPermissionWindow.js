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
import { isKeyValidLatinOrNumber } from "../../../../functions/validation";
import { ipAddressValidator } from "../../../../functions/IPAddressValidation";
import { ajaxFail } from "../../../../functions/ajaxFail";

const windowWidth = 630;
const topBar = 48;
export default class AddExportPermission extends JetView {
	config() {
		const labelWidth = 230

		var baseView = this

		var export_id

		return {
			view: "window",
			id: "add_export_permission_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Add Permission to Export", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "add_export_permission_form",
				elements: [
					{
						rows: [
							{
								paddingX: 20,
								autoheight: true,
								rows: [
									{ view: "text", id: "addExportPermissionName", label: "Export Name", labelWidth: labelWidth, readonly: true },
									{ view: "text", id: "addExportPermissionPath", label: "Storage Path", labelWidth: labelWidth, readonly: true },
									{
										height: 15
									},
									{
										view: "text", id: "addExportPermissionClient", label: "Client IP", labelWidth: labelWidth, name: "client", invalidMessage: "Invalid IP address", on: {
											onKeyPress(code, event) {
												const allowedSpecialCharacters = ".*/"
												return (isKeyValidLatinOrNumber(code, event) || allowedSpecialCharacters.indexOf(event.key) != -1)
											}
										}
									},
									{
										view: "richselect", id: "addExportPermissionPrivilege", label: "Privilege", labelWidth: labelWidth, options: [
											{ id: "rw", value: "Read/Write" },
											{ id: "ro", value: "Read Only" },
											{ id: "noaccess", value: "No Access" }
										], value: "rw"
									},
									{
										view: "richselect", id: "addExportPermissionSquash", label: "Squash", labelWidth: labelWidth, options: [
											{ id: "no_mapping", value: "No Mapping" },
											{ id: "root_to_admin", value: "Root to Admin" },
											{ id: "root_to_guest", value: "Root to Guest" },
											{ id: "all_to_admin", value: "All Users to Admin" },
											{ id: "all_to_guest", value: "All Users to Guest" },
										], value: "all_to_guest"
									},
									{
										height: 15
									},
									{
										view: "accordion",
										multi: true,
										borderless: true,
										rows: [
											{
												header: "<span class='advancedSettings'>Advanced Settings</span>", css: "advancedSettingsAccordion", id: "nfsAdvancedSettingsAccordion", borderless: true, collapsed: true, body: {
													view: "form",
													padding: 0,
													elements: [
														{
															padding: {
																top: 10, left: 10, right: 10, bottom: 0
															},
															rows: [
																{ view: "switch", id: "addExportPermissionAsync", label: "Asynchronous", labelWidth: labelWidth - 10, value: 1 },
																{ view: "switch", id: "addExportPermissionInsecureCon", label: "Allow Insecure Connections", labelWidth: labelWidth - 10 },
																{ view: "switch", id: "addExportPermissionCrossmount", label: "Cross-mount", labelWidth: labelWidth - 10 },
															]
														},
													]
												},
											},
										]
									},
								]
							},
							{},
							{
								paddingX: 20,
								cols: [
									{
										view: "button", value: "Add", css: "new_style_primary", width: 70, click: () => {
											var json_export = {
												async: $$("addExportPermissionAsync").getValue() == 1 ? "y" : "n",
												client: $$("addExportPermissionClient").getValue(),
												crossmnt: $$("addExportPermissionCrossmount").getValue() == 1 ? "y" : "n",
												export_name: $$("addExportPermissionName").getValue(),
												insecure: $$("addExportPermissionInsecureCon").getValue() == 1 ? "y" : "n",
												privilege: $$("addExportPermissionPrivilege").getValue(),
												squash: $$("addExportPermissionSquash").getValue(),
											}

											if ($$("add_export_permission_form").validate()) {
												// add permissions
												webix.ajax().post("/api/nfs/exports/permissions", JSON.stringify(json_export)).then((response) => {
													var message = response.json()

													webix.message({
														type: "success",
														expire: 10000,
														text: message
													})

													if ($$("exports_datatable").getSubView(export_id)) {
														var permissionsTable = $$("exports_datatable").getSubView(export_id).getChildViews()[1]

														permissionsTable.clearAll()
														permissionsTable.load("/api/nfs/exports/" + export_id + "/permissions").then(function () {
															$$("exports_datatable").resizeSubView(export_id)
															$$("add_export_permission_window").hide()
														}).fail((xhr) => {
															ajaxFail(xhr)
														})
													} else {
														$$("add_export_permission_window").hide()
													}
												}).fail((xhr) => {
													ajaxFail(xhr)
												})
											}
										}
									},
									{
										view: "button", value: "Cancel", css: "new_style_button", width: 70, click: () => {
											this.hideWindow()
										}
									}
								]
							},
							{
								height: 10
							}
						]
					}
				],
				rules: {
					"client": ipAddressValidator
				}
			},
			position: function (state) {
				if (this.isVisible()) {
					state.top = topBar
					state.left = state.maxWidth - windowWidth
				} else {
					state.top = topBar
					state.left = state.maxWidth
				}
				state.height = state.maxHeight - (topBar)
				state.width = windowWidth
			},
			on: {
				onShow: () => {
					export_id = baseView.getParam("export_id", true)

					webix.ajax().get("/api/nfs/exports/" + export_id).then((data) => {
						$$("addExportPermissionName").setValue(data.json().export_name)
						$$("addExportPermissionPath").setValue(data.json().storage_path)
					}).fail((xhr) => {
						ajaxFail(xhr)
					})
				},
				onHide: function () {
					// clear all fields
					$$("addExportPermissionName").setValue("")
					$$("addExportPermissionPath").setValue("")
					$$("addExportPermissionClient").setValue("")
					$$("addExportPermissionPrivilege").setValue("rw")
					$$("addExportPermissionSquash").setValue("all_to_guest")
					$$("addExportPermissionAsync").setValue(1)
					$$("addExportPermissionInsecureCon").setValue(0)
					$$("addExportPermissionCrossmount").setValue(0)

					$$("nfsAdvancedSettingsAccordion").collapse()

					// clear markings
					$$("add_export_permission_form").clearValidation()
				}
			}
		}
	}
	ready() {
		var addExportPermissionWindow = $$("add_export_permission_window")

		webix.UIManager.addHotKey("esc", function () {
			if (addExportPermissionWindow.isVisible()) {
				addExportPermissionWindow.hide()
			}
		})
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
}