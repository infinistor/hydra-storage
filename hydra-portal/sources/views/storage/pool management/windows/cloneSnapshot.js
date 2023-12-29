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

const windowWidth = 600;
export default class CloneSnapshotWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		var snapshot_id

		var datasetNameAvailable = false

		function checkIfDatasetNameAvailable(pool_name, dataset_name) {
			if (dataset_name == "") {
				datasetNameAvailable = false
				return
			}

			var json = {
				"pool_name": pool_name,
				"dataset_name": dataset_name
			}

			webix.ajax().post("/api/storage/filesystems/check", JSON.stringify(json)).then(function (data) {
				datasetNameAvailable = data.json()
				if (!datasetNameAvailable) {
					$$("clone_snapshot_form").markInvalid("dataset_name", "Dataset with this name already exists")
				} else {
					$$("clone_snapshot_form").markInvalid("dataset_name", false)
				}
			})
		}

		return {
			view: "window",
			id: "clone_snapshot_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Clone Snapshot", css: "header_label" }
				],
			},
			body: {
				view: "form",
				css: "allowOverflow",
				id: "clone_snapshot_form",
				elements: [
					{
						paddingX: 20,
						rows: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "text", label: "Snapshot", labelWidth: labelWidth, id: "cloneSnapshot_fullPath", readonly: true,
									},
									{
										view: "text", label: "Snapshot GUID", labelWidth: labelWidth, id: "cloneSnapshot_guid", readonly: true,
									},
									{
										view: "richselect", id: "cloneSnapshot_pool", label: "Target pool", labelWidth: labelWidth, name: "pool_name", invalidMessage: "Cannot be empty", readonly: true,
									},
									{
										view: "text", label: "Target dataset", labelWidth: labelWidth, name: "dataset_name", id: "cloneSnapshot_dataset", invalidMessage: "Cannot be empty", on: {
											onChange(newVal, oldVal) {
												if (newVal != "") {
													checkIfDatasetNameAvailable($$("cloneSnapshot_pool").getText(), newVal)
												}
											}
										}
									},
									{
										view: "switch", id: "cloneSnapshot_compress", label: "Compression", labelWidth: labelWidth, value: 0, on: {
											onChange: function (newVal, oldVal) {
												if (newVal == 1) {
													$$("cloneSnapshot_compressAlgorithm").show()
												} else {
													$$("cloneSnapshot_compressAlgorithm").hide()
												}
											}
										}
									},
									{
										view: "richselect", id: "cloneSnapshot_compressAlgorithm", label: "Compression Algorithm", labelWidth: labelWidth, options: [
											{ id: "lz4", value: "LZ4" },
											{ id: "gzip", value: "GZIP" },
											{ id: "zle", value: "ZLE" },
											{ id: "lzjb", value: "LZJB" },
											{ id: "zstd", value: "ZSTD" },
										], value: "lz4", hidden: true,
									},
									{
										cols: [
											{
												view: "text", label: "Quota", labelWidth: labelWidth, id: "cloneSnapshot_quota", on: {
													onKeyPress: function (code, e) {
														// Allow only numbers, backspace, tab, delete, left and right arrows
														return isKeyValidNumber(code, e)
													},
													onChange: function (newValue, oldValue) {
														if (newValue != "") {
															$$("cloneSnapshot_reservation").setValue(newValue)
														}
													}
												}, name: "quota", invalidMessage: "Has to be bigger or equal than reservation size"
											},
											{
												view: "richselect", label: "", options: ["MiB", "GiB", "TiB"], width: 70, id: "cloneSnapshot_quotaSizeUnit", value: "GiB", on: {
													onChange: function (newValue, oldValue) {
														if (newValue != "") {
															$$("cloneSnapshot_reservationSizeUnit").setValue(newValue)
														}
													}
												}
											}
										]
									},
									{
										cols: [
											{
												view: "text", label: "Reservation", labelWidth: labelWidth, id: "cloneSnapshot_reservation", on: {
													onKeyPress: function (code, e) {
														// Allow only numbers, backspace, tab, delete, left and right arrows
														return isKeyValidNumber(code, e)
													},
													onChange: function (newValue, oldValue) {
														// if newValue is bigger than quota, then set quota to newValue
														if (newValue != "") {
															if ($$("cloneSnapshot_quota").getValue() == "") {
																$$("cloneSnapshot_quota").setValue(newValue)
															} else {
																if (newValue * 1 > $$("cloneSnapshot_quota").getValue() * 1) {
																	$$("cloneSnapshot_quota").setValue(newValue)
																}
															}
														}
													}
												}
											},
											{
												view: "richselect", label: "", options: ["MiB", "GiB", "TiB"], width: 70, id: "cloneSnapshot_reservationSizeUnit", value: "GiB",
											}
										]
									},
									{
										view: "richselect", label: "Record Size", labelWidth: labelWidth, options: [
											{ id: "4k", value: "4 KiB" },
											{ id: "8k", value: "8 KiB" },
											{ id: "16k", value: "16 KiB" },
											{ id: "32k", value: "32 KiB" },
											{ id: "64k", value: "64 KiB" },
											{ id: "128k", value: "128 KiB" },
											{ id: "256k", value: "256 KiB" },
											{ id: "512k", value: "512 KiB" },
											{ id: "1m", value: "1 MiB" },
											{ id: "2m", value: "2 MiB" },
											{ id: "4m", value: "4 MiB" },
											{ id: "8m", value: "8 MiB" },
											{ id: "16m", value: "16 MiB" },
										], id: "cloneSnapshot_recordSize", value: "128k"
									},
									{ view: "text", label: "Comment", labelWidth: labelWidth, name: "comment", id: "cloneSnapshot_comment" },
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													checkIfDatasetNameAvailable($$("cloneSnapshot_pool").getText(), $$("cloneSnapshot_dataset").getValue())
													// if all fields are valid, then add the VLAN
													if ($$("clone_snapshot_form").validate() && datasetNameAvailable) {
														$$("clone_snapshot_window").disable()
														$$("clone_snapshot_window").showProgress({
															type: "icon",
															hide: false,
														})

														var quota = $$("cloneSnapshot_quota").getValue() == "" ? "none" : $$("cloneSnapshot_quota").getValue()
														var quotaSizeUnit = $$("cloneSnapshot_quotaSizeUnit").getValue() == "MiB" ? "M" : $$("cloneSnapshot_quotaSizeUnit").getValue() == "GiB" ? "G" : "T"
														var reservation = $$("cloneSnapshot_reservation").getValue() == "" ? "none" : $$("cloneSnapshot_reservation").getValue()
														var reservationSizeUnit = $$("cloneSnapshot_reservationSizeUnit").getValue() == "MiB" ? "M" : $$("cloneSnapshot_reservationSizeUnit").getValue() == "GiB" ? "G" : "T"
														var json = {
															"snapshot_full_path": $$("cloneSnapshot_fullPath").getValue(),
															"pool_ref_id": $$("cloneSnapshot_pool").getValue(),
															"dataset_name": $$("cloneSnapshot_dataset").getValue(),
															"compression": $$("cloneSnapshot_compress").getValue() == 1 ? $$("cloneSnapshot_compressAlgorithm").getValue() : "off",
															"quota": quota + (quota != "none" ? quotaSizeUnit : ""),
															"reservation": reservation + (reservation != "none" ? reservationSizeUnit : ""),
															"record_size": $$("cloneSnapshot_recordSize").getValue(),
														}

														if ($$("cloneSnapshot_comment").getValue() != "") {
															json["comment"] = $$("cloneSnapshot_comment").getValue()
														}

														webix.ajax().post("/api/storage/filesystems/clone", JSON.stringify(json)).then((response) => {
															var data = response.json()
															webix.message({ type: "default", text: data, expire: 10000 })

															$$("poolManagementTabDatasetsDatatable").clearAll()
															$$("poolManagementTabDatasetsDatatable").load("/api/storage/pools/" + poolRefId + "/filesystems")
														}).fail((xhr) => {
															ajaxFail(xhr)
														})

														$$("clone_snapshot_window").enable()
														$$("clone_snapshot_window").hideProgress()
														this.hideWindow()
													}
												}
											},
											{
												view: "button", value: "Cancel", css: "new_style_button", width: 70, click: () => {
													this.hideWindow()
												}
											},
										]
									},
								]
							},
						]
					},
				],
				rules: {
					"pool_name": webix.rules.isNotEmpty,
					"dataset_name": webix.rules.isNotEmpty,
				}
			},
			on: {
				onShow: () => {
					snapshot_id = this.getParam("snapshot_id", true)

					webix.ajax().get("/api/storage/snapshots/" + snapshot_id).then((response) => {
						var data = response.json()

						$$("cloneSnapshot_fullPath").setValue(data.full_path)
						$$("cloneSnapshot_guid").setValue(data.guid)

						var option = {
							id: data.pool_ref_id,
							value: data.pool_name
						}

						$$("cloneSnapshot_pool").define("options", [option])
						$$("cloneSnapshot_pool").setValue(data.pool_ref_id)

						$$("cloneSnapshot_compress").setValue(data.compression == "off" ? 0 : 1)
						$$("cloneSnapshot_compressAlgorithm").setValue(data.compression == "off" ? "lz4" : data.compression)

						$$("cloneSnapshot_recordSize").setValue(data.record_size)

						$$("cloneSnapshot_comment").setValue("Clone of " + data.full_path)
					})

				},
				onHide: () => {
					$$("cloneSnapshot_quota").setValue("")
					$$("cloneSnapshot_quotaSizeUnit").setValue("GiB")
					$$("cloneSnapshot_reservation").setValue("")
					$$("cloneSnapshot_reservationSizeUnit").setValue("GiB")

					$$("clone_snapshot_form").clear()
					$$("clone_snapshot_form").clearValidation()
				}
			},
			position: function (state) {
				state.top = topBar
				state.left = state.maxWidth - windowWidth
				state.height = state.maxHeight - (topBar)
				state.width = windowWidth
			}
		}
	}
	init() {
		webix.extend($$("clone_snapshot_window"), webix.ProgressBar)
	}
	ready() {
		var networkCreateDatasetWindow = $$("clone_snapshot_window")

		webix.UIManager.addHotKey("esc", function () {
			if (networkCreateDatasetWindow.isVisible())
				networkCreateDatasetWindow.hide()
		})

		var resize = this.resizeElement
		webix.event(window, "resize", function () {
			resize()
		})
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
	resizeElement() {
		const CreateDatasetForm = $$("clone_snapshot_form")

		if (CreateDatasetForm) {
			const topBar = 48
			const labelToolbar = 35
			var html = document.documentElement;

			var height = html.offsetHeight


			CreateDatasetForm.config.height = height - (topBar + labelToolbar)
			CreateDatasetForm.resize()
		}
	}
}