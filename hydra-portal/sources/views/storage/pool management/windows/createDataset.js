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

import { isKeyValidNumber, isKeyValidForZFS } from "../../../../functions/validation";

const windowWidth = 600;
export default class CreateDatasetWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		var poolRefId

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
				console.log("datasetNameAvailable: " + datasetNameAvailable)
				if (!datasetNameAvailable) {
					$$("create_dataset_form").markInvalid("dataset", "Dataset with this name already exists")
				} else {
					$$("create_dataset_form").markInvalid("dataset", false)
				}
			})
		}

		return {
			view: "window",
			id: "create_dataset_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Create Dataset", css: "header_label" }
				],
			},
			body: {
				view: "form",
				css: "allowOverflow",
				id: "create_dataset_form",
				elements: [
					{
						paddingX: 20,
						rows: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "richselect", id: "createDataset_poolName", label: "Pool", labelWidth: labelWidth, readonly: true
									},
									{
										view: "text", label: "Dataset Name", labelWidth: labelWidth, name: "dataset", id: "createDataset_datasetName", invalidMessage: "Cannot be empty", on: {
											onKeyPress: function (code, e) {
												return isKeyValidForZFS(code, e)
											},
											onChange: function (newValue, oldValue) {
												checkIfDatasetNameAvailable($$("createDataset_poolName").getText(), newValue)
											}
										}
									},
									{
										view: "switch", id: "createDataset_compress", label: "Compression", labelWidth: labelWidth, value: 0, on: {
											onChange: function (newVal, oldVal) {
												if (newVal == 1) {
													$$("createDataset_compressAlgorithm").show()
												} else {
													$$("createDataset_compressAlgorithm").hide()
												}
											}
										}
									},
									{
										view: "richselect", id: "createDataset_compressAlgorithm", label: "Compression Algorithm", labelWidth: labelWidth, options: [
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
												view: "text", label: "Quota", labelWidth: labelWidth, id: "createDataset_quota", on: {
													onKeyPress: function (code, e) {
														// Allow only numbers, backspace, tab, delete, left and right arrows
														return isKeyValidNumber(code, e)
													},
													onChange: function (newValue, oldValue) {
														if (newValue != "") {
															$$("createDataset_reservation").setValue(newValue)
														}
													}
												}, name: "quota", invalidMessage: "Has to be bigger or equal than reservation size"
											},
											{
												view: "richselect", label: "", options: ["MiB", "GiB", "TiB"], width: 70, id: "createDataset_quotaSizeUnit", value: "GiB", on: {
													onChange: function (newValue, oldValue) {
														if (newValue != "") {
															$$("createDataset_reservationSizeUnit").setValue(newValue)
														}
													}
												}
											}
										]
									},
									{
										cols: [
											{
												view: "text", label: "Reservation", labelWidth: labelWidth, id: "createDataset_reservation", on: {
													onKeyPress: function (code, e) {
														// Allow only numbers, backspace, tab, delete, left and right arrows
														return isKeyValidNumber(code, e)
													},
													onChange: function (newValue, oldValue) {
														// if newValue is bigger than quota, then set quota to newValue
														if (newValue != "") {
															if ($$("createDataset_quota").getValue() == "") {
																$$("createDataset_quota").setValue(newValue)
															} else {
																if (newValue * 1 > $$("createDataset_quota").getValue() * 1) {
																	$$("createDataset_quota").setValue(newValue)
																}
															}
														}
													}
												}
											},
											{
												view: "richselect", label: "", options: ["MiB", "GiB", "TiB"], width: 70, id: "createDataset_reservationSizeUnit", value: "GiB",
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
										], id: "createDataset_recordSize", value: "128k"
									},
									{
										view: "switch", id: "createDataset_dedup", label: "Deduplication", labelWidth: labelWidth
									},
									{ view: "text", label: "Comment", labelWidth: labelWidth, name: "comment", id: "createDataset_comment" },
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {

													checkIfDatasetNameAvailable($$("createDataset_poolName").getText(), $$("createDataset_datasetName").getValue())
													console.log(datasetNameAvailable)
													if ($$("create_dataset_form").validate() && datasetNameAvailable) {
														$$("create_dataset_window").disable()
														$$("create_dataset_window").showProgress({
															type: "icon",
															hide: false,
														})

														var quota = $$("createDataset_quota").getValue() == "" ? "none" : $$("createDataset_quota").getValue()
														var quotaSizeUnit = $$("createDataset_quotaSizeUnit").getValue() == "MiB" ? "M" : $$("createDataset_quotaSizeUnit").getValue() == "GiB" ? "G" : "T"
														var reservation = $$("createDataset_reservation").getValue() == "" ? "none" : $$("createDataset_reservation").getValue()
														var reservationSizeUnit = $$("createDataset_reservationSizeUnit").getValue() == "MiB" ? "M" : $$("createDataset_reservationSizeUnit").getValue() == "GiB" ? "G" : "T"
														var json = {
															"name": $$("createDataset_datasetName").getValue(),
															"pool_ref_id": poolRefId,
															"compression": $$("createDataset_compress").getValue() == 1 ? $$("createDataset_compressAlgorithm").getValue() : "off",
															"record_size": $$("createDataset_recordSize").getValue(),
															"quota": quota + (quota != "none" ? quotaSizeUnit : ""),
															"reservation": reservation + (reservation != "none" ? reservationSizeUnit : ""),
															"dedup": $$("createDataset_dedup").getValue() == 1 ? "on" : "off",
														}

														if ($$("createDataset_comment").getValue() != "") {
															json["comment"] = $$("createDataset_comment").getValue()
														}

														webix.ajax().post("/api/storage/pools/" + poolRefId + "/filesystems", JSON.stringify(json)).then((response) => {
															var data = response.json()
															webix.message({ type: "default", text: data, expire: 10000 })

															$$("poolManagementTabDatasetsDatatable").clearAll()
															$$("poolManagementTabDatasetsDatatable").load("/api/storage/pools/" + poolRefId + "/filesystems")
														}).fail((xhr) => {
															ajaxFail(xhr)
														})

														$$("create_dataset_window").enable()
														$$("create_dataset_window").hideProgress()
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
					"dataset": webix.rules.isNotEmpty,
					"quota": (value) => {
						// if quota is not empty, then check if it is bigger or equal to reservation
						if (value != "") {
							if ($$("createDataset_reservation").getValue() != "") {
								// check by size unit
								const quotaSizeUnit = $$("createDataset_quotaSizeUnit").getValue()
								const reservationSizeUnit = $$("createDataset_reservationSizeUnit").getValue()

								const quotaSize = quotaSizeUnit == "MiB" ? value * 1000 : quotaSizeUnit == "GiB" ? value * 1000 * 1000 : value * 1000 * 1000 * 1000
								const reservationSize = reservationSizeUnit == "MiB" ? $$("createDataset_reservation").getValue() * 1000 : reservationSizeUnit == "GiB" ? $$("createDataset_reservation").getValue() * 1000 * 1000 : $$("createDataset_reservation").getValue() * 1000 * 1000 * 1000

								if (quotaSize < reservationSize) {
									return false
								}
							}
						}

						return true
					}
				}
			},
			on: {
				onShow: () => {
					poolRefId = this.getParam("pool_id", true)

					webix.ajax().get("/api/storage/pools/" + poolRefId).then((response) => {
						var data = response.json()
						$$("createDataset_poolName").setValue(data.name)
						$$("createDataset_dedup").setValue(data.dedup)
					})
				},
				onHide: () => {
					$$("createDataset_datasetName").setValue("")
					$$("createDataset_quota").setValue("")
					$$("createDataset_quotaSizeUnit").setValue("GiB")
					$$("createDataset_reservation").setValue("")
					$$("createDataset_reservationSizeUnit").setValue("GiB")

					$$("create_dataset_form").clear()
					$$("create_dataset_form").clearValidation()
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
		webix.extend($$("create_dataset_window"), webix.ProgressBar)
	}
	ready() {
		var networkCreateDatasetWindow = $$("create_dataset_window")

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
		const CreateDatasetForm = $$("create_dataset_form")

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