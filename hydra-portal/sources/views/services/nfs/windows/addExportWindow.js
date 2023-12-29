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

import { isKeyValidForZFS } from "../../../../functions/validation";
import { ipAddressValidator } from "../../../../functions/IPAddressValidation";
import { ajaxFail } from "../../../../functions/ajaxFail";

const windowWidth = 630;
const topBar = 48;
export default class AddExport extends JetView {
	config() {
		const labelWidth = 230

		var poolInformation
		var datasetInformation
		var exportAvailable = false

		function isExportAvailable(value) {
			if (value == "") {
				$$("add_export_form").markInvalid("export", "Cannot be empty")
				exportAvailable = false
				return
			}
			webix.ajax().get("/api/nfs/export-name-taken/" + value).then((data) => {
				var exportTaken = data.json()
				if (exportTaken) {
					$$("add_export_form").markInvalid("export", "Export already exists")
					exportAvailable = false
				} else {
					$$("add_export_form").markInvalid("export", false)
					exportAvailable = true
				}
			})
		}

		return {
			view: "window",
			id: "add_export_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Create Export", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "add_export_form",
				elements: [
					{
						rows: [
							{
								paddingX: 20,
								autoheight: true,
								rows: [
									{
										view: "text", id: "addExportName", label: "Export Name", name: "export", invalidMessage: "Cannot be empty", labelWidth: labelWidth,
										format: {
											parse: function (value) {
												return value
											},
											edit: function (value) {
												return value.trim()
											}
										},
										on: {
											onChange: function (newVal, oldVal) {
												isExportAvailable(newVal)
											},
											onKeyPress: function (code, event) {
												// allow space, - and _
												var letter = event.key
												return isKeyValidForZFS(code, event) || letter == " "
											}
										}
									},
									{
										view: "richselect", id: "addExportPoolSelect", label: "Storage Pool", name: "pool", invalidMessage: "Cannot be empty", labelWidth: labelWidth, on: {
											onChange: function (newVal, oldVal) {
												if (newVal != "") {
													var pool_id = this.getValue()

													// get dataset list
													webix.ajax().get("/api/storage/pools/" + pool_id + "/filesystems").then((data) => {
														datasetInformation = data.json()

														var datasets = datasetInformation.map(function (dataset) {
															return { id: dataset.id, value: dataset.name }
														})

														$$("addExportDatasetSelect").define("options", datasets)
														$$("addExportDatasetSelect").refresh()
													})
												}
											}
										}
									},
									{
										view: "richselect", id: "addExportDatasetSelect", label: "Dataset", name: "dataset", invalidMessage: "Cannot be empty", labelWidth: labelWidth, on: {
											onChange: function (newVal, oldVal) {
												if (newVal != "") {
													var dataset_id = this.getValue()

													webix.ajax().get("/api/storage/filesystems/" + dataset_id + "/services").then(function (data) {
														var serviceInfo = data.json()


														if (serviceInfo.used) {
															var services = serviceInfo.service.split(",")

															if (services.includes("S3")) {
																webix.message({
																	type: "debug",
																	text: "Dataset is already used by S3 service. You can create an export for this dataset, but there might be some issues with S3 service.",
																	expire: 10000,
																})
															}
														}
													})
												}
											}
										}
									},
									{ view: "text", id: "addExportComment", label: "Comment", name: "comment", labelWidth: labelWidth },
									{ view: "switch", id: "addExportEnableSwitch", label: "Enable", labelWidth: labelWidth },
									{
										height: 15
									},
									{
										view: "text", id: "addExportClient", label: "Client IP", labelWidth: labelWidth, name: "client", invalidMessage: "Invalid IP address", on: {
											onKeyPress(code, event) {
												const allowedSpecialCharacters = ".*/"
												return (isKeyValidLatinOrNumber(code, event) || allowedSpecialCharacters.indexOf(event.key) != -1)
											},
											onChange: function (newVal, oldVal) {
												if (ipAddressValidator(newVal)) {
													$$("add_export_form").markInvalid("client", false)
												} else {
													$$("add_export_form").markInvalid("client", "Invalid IP address")
												}
											}
										}
									},
									{
										view: "richselect", id: "addExportPrivilege", label: "Privilege", labelWidth: labelWidth, options: [
											{ id: "rw", value: "Read/Write" },
											{ id: "ro", value: "Read Only" },
											{ id: "noaccess", value: "No Access" }
										], value: "rw"
									},
									{
										view: "richselect", id: "addExportSquash", label: "Squash", labelWidth: labelWidth, options: [
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
												header: "<span class='advancedSettings'>Advanced Settings</span>", css: "advancedSettingsAccordion", id: "nfsAdvancedSettingsAccordion2", borderless: true, collapsed: true, body: {
													view: "form",
													padding: 0,
													elements: [
														{
															padding: {
																top: 10, left: 10, right: 10, bottom: 0
															},
															rows: [
																{ view: "switch", id: "addExportAsync", label: "Asynchronous", labelWidth: labelWidth - 10, value: 1 },
																{ view: "switch", id: "addExportInsecureCon", label: "Allow Insecure Connections", labelWidth: labelWidth - 10 },
																{ view: "switch", id: "addExportCrossmount", label: "Cross-mount", labelWidth: labelWidth - 10 },
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
												"export_name": $$("addExportName").getValue(),
												"dataset_ref_id": $$("addExportDatasetSelect").getValue(),
												"comment": $$("addExportComment").getValue(),
												"enabled": $$("addExportEnableSwitch").getValue() == 0 ? "n" : "y",
											}

											// isDatasetAvailable($$("addExportDatasetSelect").getValue())
											isExportAvailable($$("addExportName").getValue())
											if ($$("add_export_form").validate() && exportAvailable) {
												// add export

												webix.ajax().post("/api/nfs/exports", JSON.stringify(json_export)).then((data) => {
													var json_export_permission = {
														async: $$("addExportAsync").getValue() == 1 ? "y" : "n",
														client: $$("addExportClient").getValue(),
														crossmnt: $$("addExportCrossmount").getValue() == 1 ? "y" : "n",
														export_name: $$("addExportName").getValue(),
														insecure: $$("addExportInsecureCon").getValue() == 1 ? "y" : "n",
														privilege: $$("addExportPrivilege").getValue(),
														squash: $$("addExportSquash").getValue(),
													}

													webix.ajax().post("/api/nfs/exports/permissions", JSON.stringify(json_export_permission)).then(() => {
														this.hideWindow()
														$$("exports_datatable").clearAll()
														$$("exports_datatable").load("/api/nfs/exports")

														webix.message({
															type: "success",
															text: "Export added successfully",
															expire: 10000,
														})
													}).fail((xhr) => {
														ajaxFail(xhr)
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
				rules: {
					"export": (value) => {
						// if null return false
						if (value == "") {
							return false
						}
						// length should be less than 255
						if (value.length > 255) {
							return false
						}
						return true
					},
					"dataset": webix.rules.isNotEmpty,
					"pool": webix.rules.isNotEmpty,
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
				onShow: function () {
					webix.ajax().get("/api/storage/pools").then(function (data) {
						poolInformation = data.json()
						var pools = poolInformation.map(function (pool) {
							return { id: pool.id, value: pool.name }
						})

						$$("addExportPoolSelect").define("options", pools)
						$$("addExportPoolSelect").refresh()
					})
				},
				onHide: function () {
					// clear all fields
					$$("addExportName").setValue("")
					$$("addExportComment").setValue("")
					$$("addExportPoolSelect").setValue("")
					$$("addExportDatasetSelect").setValue("")
					// $$("addExportPath").setValue("")
					$$("addExportEnableSwitch").setValue(0)

					$$("addExportClient").setValue("")
					$$("addExportPrivilege").setValue("rw")
					$$("addExportSquash").setValue("all_to_guest")
					$$("addExportAsync").setValue(1)
					$$("addExportInsecureCon").setValue(0)
					$$("addExportCrossmount").setValue(0)

					$$("nfsAdvancedSettingsAccordion2").collapse()

					// clear markings
					$$("add_export_form").clearValidation()
				}
			}
		}
	}
	ready() {
		var addExportWindow = $$("add_export_window")

		webix.UIManager.addHotKey("esc", function () {
			if (addExportWindow.isVisible()) {
				addExportWindow.hide()
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