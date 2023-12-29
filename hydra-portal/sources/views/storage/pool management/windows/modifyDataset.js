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
export default class ModifyDatasetWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		var poolRefId
		var datasetRefId

		return {
			view: "window",
			id: "modify_dataset_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Modify Dataset", css: "header_label" }
				],
			},
			body: {
				view: "form",
				css: "allowOverflow",
				id: "modify_dataset_form",
				elements: [
					{
						paddingX: 20,
						rows: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "richselect", id: "modifyDataset_poolName", label: "Pool", labelWidth: labelWidth, readonly: true
									},
									{
										view: "text", label: "Dataset Name", labelWidth: labelWidth, id: "modifyDataset_datasetName", readonly: true
									},
									{
										view: "switch", id: "modifyDataset_compress", label: "Compression", labelWidth: labelWidth, value: 0, on: {
											onChange: function (newVal, oldVal) {
												if (newVal == 1) {
													$$("modifyDataset_compressAlgorithm").show()
												} else {
													$$("modifyDataset_compressAlgorithm").hide()
												}
											}
										}
									},
									{
										view: "richselect", id: "modifyDataset_compressAlgorithm", label: "Compression Algorithm", labelWidth: labelWidth, options: [
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
												view: "text", label: "Quota", labelWidth: labelWidth, id: "modifyDataset_quota", on: {
													onKeyPress: function (code, e) {
														// Allow only numbers, backspace, tab, delete, left and right arrows
														return isKeyValidNumber(code, e)
													},
													onChange: function (newValue, oldValue) {
														if (newValue != "") {
															$$("modifyDataset_reservation").setValue(newValue)
														}
													}
												}, name: "quota", invalidMessage: "Has to be bigger or equal than reservation size"
											},
											{
												view: "richselect", label: "", options: ["MiB", "GiB", "TiB"], width: 70, id: "modifyDataset_quotaSizeUnit", value: "GiB", on: {
													onChange: function (newValue, oldValue) {
														if (newValue != "") {
															$$("modifyDataset_reservationSizeUnit").setValue(newValue)
														}
													}
												}
											}
										]
									},
									{
										cols: [
											{
												view: "text", label: "Reservation", labelWidth: labelWidth, id: "modifyDataset_reservation", on: {
													onKeyPress: function (code, e) {
														// Allow only numbers, backspace, tab, delete, left and right arrows
														return isKeyValidNumber(code, e)
													},
													onChange: function (newValue, oldValue) {
														// if newValue is bigger than quota, then set quota to newValue
														if (newValue != "") {
															if ($$("modifyDataset_quota").getValue() == "") {
																$$("modifyDataset_quota").setValue(newValue)
															} else {
																if (newValue * 1 > $$("modifyDataset_quota").getValue() * 1) {
																	$$("modifyDataset_quota").setValue(newValue)
																}
															}
														}
													}
												}
											},
											{
												view: "richselect", label: "", options: ["MiB", "GiB", "TiB"], width: 70, id: "modifyDataset_reservationSizeUnit", value: "GiB",
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
										], id: "modifyDataset_recordSize", value: "128k"
									},
									{
										view: "switch", id: "modifyDataset_dedup", label: "Deduplication", labelWidth: labelWidth, value: 0,
									},
									{ view: "text", label: "Comment", labelWidth: labelWidth, name: "comment", id: "modifyDataset_comment" },
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													if ($$("modify_dataset_form").validate()) {
														$$("modify_dataset_window").disable()
														$$("modify_dataset_window").showProgress({
															type: "icon",
															hide: false,
														})

														var quota = $$("modifyDataset_quota").getValue() == "" ? "none" : $$("modifyDataset_quota").getValue()
														var quotaSizeUnit = $$("modifyDataset_quotaSizeUnit").getValue() == "MiB" ? "M" : $$("modifyDataset_quotaSizeUnit").getValue() == "GiB" ? "G" : "T"
														var reservation = $$("modifyDataset_reservation").getValue() == "" ? "none" : $$("modifyDataset_reservation").getValue()
														var reservationSizeUnit = $$("modifyDataset_reservationSizeUnit").getValue() == "MiB" ? "M" : $$("modifyDataset_reservationSizeUnit").getValue() == "GiB" ? "G" : "T"
														var json = {
															"compression": $$("modifyDataset_compress").getValue() == 1 ? $$("modifyDataset_compressAlgorithm").getValue() : "off",
															"record_size": $$("modifyDataset_recordSize").getValue(),
															"quota": quota + (quota != "none" ? quotaSizeUnit : ""),
															"reservation": reservation + (reservation != "none" ? reservationSizeUnit : ""),
															"dedup": $$("modifyDataset_dedup").getValue() == 1 ? "on" : "off",
														}

														if ($$("modifyDataset_comment").getValue() != "") {
															json["comment"] = $$("modifyDataset_comment").getValue()
														}

														console.log(json)

														webix.ajax().put("/api/storage/filesystems/" + datasetRefId, JSON.stringify(json)).then((response) => {
															webix.message({ type: "default", text: "Filesystem modified" })
															$$("poolManagementTabDatasetsDatatable").clearAll()
															$$("poolManagementTabDatasetsDatatable").load("/api/storage/pools/" + poolRefId + "/filesystems")
														}).fail((xhr) => {
															ajaxFail(xhr)
														})

														$$("modify_dataset_window").enable()
														$$("modify_dataset_window").hideProgress()
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
					"quota": (value) => {
						// if quota is not empty, then check if it is bigger or equal to reservation
						if (value != "") {
							if ($$("modifyDataset_reservation").getValue() != "") {
								// check by size unit
								const quotaSizeUnit = $$("modifyDataset_quotaSizeUnit").getValue()
								const reservationSizeUnit = $$("modifyDataset_reservationSizeUnit").getValue()

								const quotaSize = quotaSizeUnit == "MiB" ? value * 1000 : quotaSizeUnit == "GiB" ? value * 1000 * 1000 : value * 1000 * 1000 * 1000
								const reservationSize = reservationSizeUnit == "MiB" ? $$("modifyDataset_reservation").getValue() * 1000 : reservationSizeUnit == "GiB" ? $$("modifyDataset_reservation").getValue() * 1000 * 1000 : $$("modifyDataset_reservation").getValue() * 1000 * 1000 * 1000

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
					datasetRefId = this.getParam("dataset_id", true)

					webix.ajax().get("/api/storage/pools/" + poolRefId).then((response) => {
						var data = response.json()
						$$("modifyDataset_poolName").setValue(data.name)

						webix.ajax().get("/api/storage/filesystems/" + datasetRefId).then((response) => {
							var data = response.json()
							$$("modifyDataset_datasetName").setValue(data.name)
							$$("modifyDataset_quota").setValue(data.quota == "none" ? "" : data.quota.substring(0, data.quota.length - 1))
							$$("modifyDataset_quotaSizeUnit").setValue(data.quota == "none" ? "GiB" : data.quota.substring(data.quota.length - 1, data.quota.length) == "M" ? "MiB" : data.quota.substring(data.quota.length - 1, data.quota.length) == "G" ? "GiB" : "TiB")
							$$("modifyDataset_reservation").setValue(data.reservation == "none" ? "" : data.reservation.substring(0, data.reservation.length - 1))
							$$("modifyDataset_reservationSizeUnit").setValue(data.reservation == "none" ? "GiB" : data.reservation.substring(data.reservation.length - 1, data.reservation.length) == "M" ? "MiB" : data.reservation.substring(data.reservation.length - 1, data.reservation.length) == "G" ? "GiB" : "TiB")
							$$("modifyDataset_compress").setValue(data.compression == "off" ? 0 : 1)
							$$("modifyDataset_compressAlgorithm").setValue(data.compression == "off" ? "lz4" : data.compression)
							$$("modifyDataset_recordSize").setValue(data.record_size)
							$$("modifyDataset_dedup").setValue(data.dedup == "off" ? 0 : 1)
							$$("modifyDataset_comment").setValue(data.comment)
						})
					})
				},
				onHide: () => {
					$$("modifyDataset_datasetName").setValue("")
					$$("modifyDataset_quota").setValue("")
					$$("modifyDataset_quotaSizeUnit").setValue("GiB")
					$$("modifyDataset_reservation").setValue("")
					$$("modifyDataset_reservationSizeUnit").setValue("GiB")

					$$("modify_dataset_form").clear()
					$$("modify_dataset_form").clearValidation()
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
		webix.extend($$("modify_dataset_window"), webix.ProgressBar)
	}
	ready() {
		var modifyDatasetWindow = $$("modify_dataset_window")

		webix.UIManager.addHotKey("esc", function () {
			if (modifyDatasetWindow.isVisible())
				modifyDatasetWindow.hide()
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
		const modifyDatasetForm = $$("modify_dataset_form")

		if (modifyDatasetForm) {
			const topBar = 48
			const labelToolbar = 35
			var html = document.documentElement;

			var height = html.offsetHeight


			modifyDatasetForm.config.height = height - (topBar + labelToolbar)
			modifyDatasetForm.resize()
		}
	}
}