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
import { ajaxFail } from "../../../../functions/ajaxFail";

const windowWidth = 630;
const topBar = 48;
export default class EditExportPermission extends JetView {
	config() {
		const labelWidth = 230

		var baseView = this

		var export_id
		var permission_id

		return {
			view: "window",
			id: "edit_export_permission_window",
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
				id: "edit_export_permission_form",
				elements: [
					{
						rows: [
							{
								paddingX: 20,
								autoheight: true,
								rows: [
									{ view: "text", id: "editExportPermissionName", label: "Export Name", labelWidth: labelWidth, readonly: true },
									{ view: "text", id: "editExportPermissionPath", label: "Storage Path", labelWidth: labelWidth, readonly: true },
									{
										height: 15
									},
									{ view: "text", id: "editExportPermissionClient", label: "Client IP", labelWidth: labelWidth, readonly: true },
									{
										view: "richselect", id: "editExportPermissionPrivilege", label: "Privilege", labelWidth: labelWidth, options: [
											{ id: "rw", value: "Read/Write" },
											{ id: "ro", value: "Read Only" },
											{ id: "noaccess", value: "No Access" }
										], value: "rw"
									},
									{
										view: "richselect", id: "editExportPermissionSquash", label: "Squash", labelWidth: labelWidth, options: [
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
												header: "<span class='advancedSettings'>Advanced Settings</span>", css: "advancedSettingsAccordion", id: "nfsEditAdvancedSettingsAccordion", borderless: true, collapsed: true, body: {
													view: "form",
													padding: 0,
													elements: [
														{
															padding: {
																top: 10, left: 10, right: 10, bottom: 0
															},
															rows: [
																{ view: "switch", id: "editExportPermissionAsync", label: "Asynchronous", labelWidth: labelWidth - 10, value: 1 },
																{ view: "switch", id: "editExportPermissionInsecureCon", label: "Allow Insecure Connections", labelWidth: labelWidth - 10 },
																{ view: "switch", id: "editExportPermissionCrossmount", label: "Cross-mount", labelWidth: labelWidth - 10 },
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
												async: $$("editExportPermissionAsync").getValue() == 1 ? "y" : "n",
												client: $$("editExportPermissionClient").getValue(),
												crossmnt: $$("editExportPermissionCrossmount").getValue() == 1 ? "y" : "n",
												export_name: $$("editExportPermissionName").getValue(),
												insecure: $$("editExportPermissionInsecureCon").getValue() == 1 ? "y" : "n",
												privilege: $$("editExportPermissionPrivilege").getValue(),
												squash: $$("editExportPermissionSquash").getValue(),
											}

											if ($$("edit_export_permission_form").validate()) {
												// edit permission
												webix.ajax().put("/api/nfs/exports/permissions/" + permission_id, JSON.stringify(json_export)).then(() => {
													if ($$("exports_datatable").getSubView(export_id)) {
														var permissionsTable = $$("exports_datatable").getSubView(export_id).getChildViews()[1]

														permissionsTable.clearAll()
														permissionsTable.load("/api/nfs/exports/" + export_id + "/permissions").then(function () {
															$$("exports_datatable").resizeSubView(export_id)
															$$("edit_export_permission_window").hide()
														})
													} else {
														$$("edit_export_permission_window").hide()
													}
													webix.message({
														type: "success",
														expire: 10000,
														text: "Permissions edited"
													})
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
					permission_id = baseView.getParam("permission_id", true)

					webix.ajax().get("/api/nfs/exports/" + export_id).then((data) => {
						$$("editExportPermissionName").setValue(data.json().export_name)
						$$("editExportPermissionPath").setValue(data.json().storage_path)
					})

					webix.ajax().get("/api/nfs/exports/permissions/" + permission_id).then((data) => {
						$$("editExportPermissionClient").setValue(data.json().client)
						$$("editExportPermissionPrivilege").setValue(data.json().privilege)
						$$("editExportPermissionSquash").setValue(data.json().squash)
						$$("editExportPermissionAsync").setValue(data.json().async == "y" ? 1 : 0)
						$$("editExportPermissionInsecureCon").setValue(data.json().insecure == "y" ? 1 : 0)
						$$("editExportPermissionCrossmount").setValue(data.json().crossmnt == "y" ? 1 : 0)
					})
				},
				onHide: function () {
					// clear all fields
					$$("editExportPermissionName").setValue("")
					$$("editExportPermissionPath").setValue("")
					$$("editExportPermissionClient").setValue("")
					$$("editExportPermissionPrivilege").setValue("rw")
					$$("editExportPermissionSquash").setValue("all_to_guest")
					$$("editExportPermissionAsync").setValue(1)
					$$("editExportPermissionInsecureCon").setValue(0)
					$$("editExportPermissionCrossmount").setValue(0)

					$$("nfsEditAdvancedSettingsAccordion").collapse()

					// clear markings
					$$("edit_export_permission_form").clearValidation()
				}
			}
		}
	}
	ready() {
		var editExportPermissionWindow = $$("edit_export_permission_window")

		webix.UIManager.addHotKey("esc", function () {
			if (editExportPermissionWindow.isVisible()) {
				editExportPermissionWindow.hide()
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