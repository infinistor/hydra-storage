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
import SMBTab from "./tabs/smbTab";

import { isKeyValidForZFS } from "../../../../functions/validation";
import { ajaxFail } from "../../../../functions/ajaxFail";

const windowWidth = 630;
const topBar = 48;
export default class AddShare extends JetView {
	config() {
		const labelWidth = 230

		var share_id

		var poolInformation
		var datasetInformation
		var baseView = this

		var datasetAvailable = false
		var shareAvailable = false

		function isDatasetAvailable(value) {
			if (value == "") {
				$$("add_share_form").markInvalid("dataset", "Cannot be empty")
				datasetAvailable = false
				return
			}
			webix.ajax().get("/api/smb/datasets/name-taken/" + value).then((data) => {
				var datasetTaken = data.json()
				if (datasetTaken) {
					$$("add_share_form").markInvalid("dataset", "Dataset already exists")
					datasetAvailable = false
				} else {
					$$("add_share_form").markInvalid("dataset", false)
					datasetAvailable = true
				}
			})
		}

		function isShareAvailable(value) {
			if (value == "") {
				$$("add_share_form").markInvalid("share", "Cannot be empty")
				shareAvailable = false
				return
			}
			webix.ajax().get("/api/smb/shares/name-taken/" + value).then((data) => {
				var shareTaken = data.json()
				if (shareTaken) {
					$$("add_share_form").markInvalid("share", "Share already exists")
					shareAvailable = false
				} else {
					$$("add_share_form").markInvalid("share", false)
					shareAvailable = true
				}
			})
		}

		return {
			view: "window",
			id: "add_share_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", id: "addShareTitle", label: "Create Share", css: "header_label" }
				],
			},
			body: {
				view: "form",
				id: "add_share_form",
				elements: [
					{
						rows: [
							{
								paddingX: 20,
								autoheight: true,
								rows: [
									{
										view: "text", id: "addShareName", label: "Share Name", name: "share", invalidMessage: "Cannot be empty", labelWidth: labelWidth, format: {
											parse: function (value) {
												return value
											},
											edit: function (value) {
												return value.trim()
											}
										},
										on: {
											onChange: function (newVal, oldVal) {
												if (share_id == "") {
													isShareAvailable(newVal)
												}
											},
											onKeyPress: function (code, event) {
												// if create share
												if (share_id == "") {
													// allow space, - and _
													var letter = event.key
													return isKeyValidForZFS(code, event) || letter == " "
												}
											}
										}
									},
									{
										view: "richselect", id: "addSharePoolSelect", label: "Storage Pool", name: "pool", invalidMessage: "Cannot be empty", labelWidth: labelWidth, on: {
											onChange: function (newVal, oldVal) {
												if (share_id == "") {
													if (newVal != "") {
														// get pool id with pool name = newVal from poolInformation
														var pool_id = poolInformation.find(pool => pool.name == newVal).id

														// load datasets
														webix.ajax().get("/api/storage/pools/" + pool_id + "/filesystems").then((data) => {
															datasetInformation = data.json()
															var datasets = datasetInformation.map(function (dataset) {
																return { id: dataset.id, value: dataset.name }
															})
															$$("addShareDatasetSelect").define("options", datasets)
															$$("addShareDatasetSelect").refresh()
														})
													}
												}
											}
										},
									},
									{
										view: "richselect", id: "addShareDatasetSelect", label: "Dataset", name: "dataset", invalidMessage: "Cannot be empty", labelWidth: labelWidth, on: {
											onChange: function (newVal, oldVal) {
												if (share_id == "") {
													var dataset_id = this.getValue()

													webix.ajax().get("/api/storage/filesystems/" + dataset_id + "/services").then(function (data) {
														var serviceInfo = data.json()


														if (serviceInfo.used) {
															var services = serviceInfo.service.split(",")

															if (services.includes("S3")) {
																webix.message({
																	type: "debug",
																	text: "Dataset is already used by S3 service. You can create a share for this dataset, but there might be some issues with S3 service.",
																	expire: 10000,
																})
															}
														}
													})
												}
											}
										}
									},
									// { view: "text", id: "addSharePath", label: "Storage Path", labelWidth: labelWidth, readonly: true },
									{ view: "text", id: "addShareComment", label: "Comment", name: "comment", labelWidth: labelWidth },
								]
							},
							{
								cells: [
									SMBTab
								]
							},
							{},
							{
								paddingX: 20,
								cols: [
									{
										view: "button", id: "addShareButton", value: "Add", css: "new_style_primary", width: 70, click: () => {
											if ($$("add_share_form").validate() && $$("SMB").validate()) {
												var json_share = {
													"share_name": $$("addShareName").getValue(),
													"dataset_ref_id": $$("addShareDatasetSelect").getValue(),
													"comment": $$("addShareComment").getValue(),
													"enabled": $$("smbEnableSwitch").getValue() == 0 ? "n" : "y",
													"mac_support": $$("smbSupportForMacOSSwitch").getValue() == 0 ? "n" : "y",
													"browsable": $$("smbBrowsableSwitch").getValue() == 0 ? "n" : "y",
													"writable": $$("smbReadOnlySwitch").getValue() == 0 ? "y" : "n",
													"guest_access": $$("smbGuestAccessSwitch").getValue() == 0 ? "n" : "y",
													"case_sensitive": $$("smbNetworkAccessSelect").getValue() == "Yes" ? "y" : $$("smbNetworkAccessSelect").getValue() == "No" ? "n" : "a",
													"oplock": $$("smbOplockSwitch").getValue() == 0 ? "n" : "y",
													"level2_oplocks": $$("smbLevel2Oplocks").getValue() == 0 ? "n" : "y",
													"kernel_share_modes": $$("smbKernelShareModels").getValue() == 0 ? "n" : "y",
													"posix_locking": $$("smbPosixLocking").getValue() == 0 ? "n" : "y",
													"inherit_owner": $$("smbInheritOwner").getValue() == 0 ? "n" : "y",
													"inherit_permissions": $$("smbInheritPermissions").getValue() == 0 ? "n" : "y",
													"delete_veto_files": $$("smbDeleteVetoFiles").getValue() == 0 ? "n" : "y",
													"full_audit": $$("smbFullAudit").getValue() == 0 ? "n" : "y",
												}

												if ($$("smbNetworkAccessSelect").getValue() != "Disabled") {
													if ($$("smbNetworkAccessSelect").getValue() == "Allow access to specific IP/network addresses") {
														json_share["network_access_allow"] = $$("smbNetworkAllowText").getValue() == "" ? "*" : $$("smbNetworkAllowText").getValue()
														json_share["network_access_allow_except"] = $$("smbNetworkAllowExceptText").getValue()
													} else {
														json_share["network_access_deny"] = $$("smbNetworkDenyText").getValue() == "" ? "*" : $$("smbNetworkDenyText").getValue()
														json_share["network_access_deny_except"] = $$("smbNetworkDenyExceptText").getValue()
													}
												}

												if ($$("smbVetoFilesText").getValue() != "") {
													json_share["veto_files"] = $$("smbVetoFilesText").getValue()
												}

												if ($$("smbWORMSwitch").getValue() == 1) {
													json_share["worm"] = "y"
													json_share["grace_period"] = $$("smbGracePeriodNumber").getValue() * ($$("smbGracePeriodSelect").getValue() == "minutes" ? 60 : $$("smbGracePeriodSelect").getValue() == "hours" ? 3600 : 1)
												} else {
													json_share["worm"] = "n"
													json_share["grace_period"] = 0
												}

												if (share_id != "") {
													// edit share
													webix.ajax().put("/api/smb/shares/" + share_id, JSON.stringify(json_share)).then((data) => {
														this.hideWindow()
														$$("share_datatable").clearAll()
														$$("share_datatable").load("/api/smb/shares")

														webix.message({
															type: "success",
															text: data.json(),
															expire: 2000,
														})
													}).fail((xhr) => {
														ajaxFail(xhr)
													})
												} else {
													// isDatasetAvailable($$("addShareDatasetSelect").getValue())
													isShareAvailable($$("addShareName").getValue())
													if ($$("add_share_form").validate() && shareAvailable) {
														// add share

														webix.ajax().post("/api/smb/shares", JSON.stringify(json_share)).then((data) => {
															this.hideWindow()
															$$("share_datatable").clearAll()
															$$("share_datatable").load("/api/smb/shares")

															webix.message({
																type: "success",
																text: data.json(),
																expire: 10000,
															})
														}).fail((xhr) => {
															ajaxFail(xhr)
														})
													}
												}
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
					"share": (value) => {
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
					"pool": webix.rules.isNotEmpty,
					"dataset": webix.rules.isNotEmpty,
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
				state.height = state.maxHeight - topBar
				state.width = windowWidth
			},
			on: {
				onShow: function () {
					share_id = baseView.getParam("id", true)
					if (share_id != "") {
						// edit share
						$$("addShareTitle").setValue("Edit Share")
						$$("addShareButton").setValue("Apply")

						webix.ajax().get("/api/smb/shares/" + share_id).then(function (data) {
							var share = data.json()

							$$("addShareName").setValue(share.share_name)
							$$("addShareName").config.attributes = { readonly: "true" };
							$$("addShareName").refresh();

							$$("addShareComment").setValue(share.comment)

							$$("smbEnableSwitch").setValue(share.enable == "y" ? 1 : 0)
							$$("smbBrowsableSwitch").setValue(share.browsable == "y" ? 1 : 0)
							$$("smbReadOnlySwitch").setValue(share.writable == "y" ? 0 : 1)
							$$("smbGuestAccessSwitch").setValue(share.guest_access == "y" ? 1 : 0)
							$$("smbCaseSensiticeRadio").setValue(share.case_sensitive == "y" ? "Yes" : share.case_sensitive == "n" ? "No" : "Auto")
							$$("smbOplockSwitch").setValue(share.oplock == "y" ? 1 : 0)
							$$("smbLevel2Oplocks").setValue(share.level2_oplocks == "y" ? 1 : 0)
							$$("smbKernelShareModels").setValue(share.kernel_share_modes == "y" ? 1 : 0)
							$$("smbPosixLocking").setValue(share.posix_locking == "y" ? 1 : 0)
							$$("smbInheritOwner").setValue(share.inherit_owner == "y" ? 1 : 0)
							$$("smbInheritPermissions").setValue(share.inherit_permissions == "y" ? 1 : 0)
							$$("smbDeleteVetoFiles").setValue(share.delete_veto_files == "y" ? 1 : 0)
							$$("smbVetoFilesText").setValue(share.veto_files == "" ? "" : share.veto_files)
							$$("smbFullAudit").setValue(share.full_audit == "y" ? 1 : 0)

							// network access
							if (share.network_access_allow != "") {
								$$("smbNetworkAccessSelect").setValue("Allow access to specific IP/network addresses")
								$$("smbNetworkAllowText").setValue(share.network_access_allow)
								$$("smbNetworkAllowExceptText").setValue(share.network_access_allow_except)
							} else if (share.network_access_deny != "") {
								$$("smbNetworkAccessSelect").setValue("Deny access to specific IP/network address")
								$$("smbNetworkDenyText").setValue(share.network_access_deny)
								$$("smbNetworkDenyExceptText").setValue(share.network_access_deny_except)
							} else {
								$$("smbNetworkAccessSelect").setValue("Disabled")
							}

							$$("smbSupportForMacOSSwitch").setValue(share.mac_support == "y" ? 1 : 0)
							$$("smbSupportForMacOSSwitch").define("disabled", true)
							$$("smbSupportForMacOSSwitch").refresh()

							// WORM 
							$$("smbWORMSwitch").setValue(share.worm == "y" ? 1 : 0)
							// grace period: seconds, minutes or hours
							$$("smbGracePeriodNumber").setValue(share.grace_period < 60 ? share.grace_period : share.grace_period < 3600 ? Math.floor(share.grace_period / 60) : Math.floor(share.grace_period / 3600))
							$$("smbGracePeriodSelect").setValue(share.grace_period < 60 ? "seconds" : share.grace_period < 3600 ? "minutes" : "hours")
						})

						$$("addSharePoolSelect").define("readonly", true)
						$$("addSharePoolSelect").refresh()

						$$("addShareDatasetSelect").define("readonly", true)
						$$("addShareDatasetSelect").refresh()
						webix.ajax().get("/api/smb/dataset-info/" + share_id).then(function (data) {
							var dataset = data.json()
							$$("addSharePoolSelect").setValue(dataset.pool_name)

							$$("addShareDatasetSelect").setValue(dataset.dataset_name)
							// $$("addSharePath").setValue(dataset.dataset_path)
						})

					} else {
						// create share
						$$("addShareTitle").setValue("Create Share")
						$$("addShareButton").setValue("Add")

						webix.ajax().get("/api/storage/pools").then(function (data) {
							poolInformation = data.json()
							var pools = poolInformation.map(function (pool) {
								return { id: pool.name, value: pool.name }
							})

							$$("addSharePoolSelect").define("options", pools)
							$$("addSharePoolSelect").refresh()
						})

						webix.ajax().get("/api/smb/config/default_veto_files").then(function (data) {
							$$("smbVetoFilesText").setValue(data.json())
						})
					}
				},
				onHide: function () {
					// clear all fields
					$$("addShareName").setValue("")
					$$("addShareComment").setValue("")
					$$("addSharePoolSelect").setValue("")
					$$("addShareDatasetSelect").setValue("")
					// $$("addSharePath").setValue("")
					$$("smbEnableSwitch").setValue(0)
					$$("smbBrowsableSwitch").setValue(1)
					$$("smbReadOnlySwitch").setValue(0)
					$$("smbGuestAccessSwitch").setValue(0)
					$$("smbNetworkAccessSelect").setValue("Disabled")
					$$("smbNetworkAllowText").setValue("")
					$$("smbNetworkDenyText").setValue("")
					$$("smbNetworkAllowExceptText").setValue("")
					$$("smbNetworkDenyExceptText").setValue("")
					$$("smbCaseSensiticeRadio").setValue("Auto")
					$$("smbOplockSwitch").setValue(1)
					$$("smbKernelShareModels").setValue(0)
					$$("smbPosixLocking").setValue(1)
					$$("smbInheritOwner").setValue(0)
					$$("smbInheritPermissions").setValue(1)
					$$("smbDeleteVetoFiles").setValue(1)
					$$("smbVetoFilesText").setValue("")
					$$("smbFullAudit").setValue(0)
					$$("smbSupportForMacOSSwitch").setValue(0)

					$$("smbSupportForMacOSSwitch").define("disabled", false)
					$$("smbSupportForMacOSSwitch").refresh()

					$$("addShareName").config.attributes = undefined;
					$$("addShareName").refresh();

					$$("addSharePoolSelect").define("readonly", false)

					$$("smbAdvancedSettingsAccordion").collapse()

					$$("add_share_form").clearValidation()
					$$("SMB").clearValidation()

					$$("smbWORMSwitch").setValue(0)
					$$("smbGracePeriodNumber").setValue("5")
					$$("smbGracePeriodSelect").setValue("minutes")
				}
			}
		}
	}
	ready() {
		var addShareWindow = $$("add_share_window")

		webix.UIManager.addHotKey("esc", function () {
			if (addShareWindow.isVisible()) {
				addShareWindow.hide()
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