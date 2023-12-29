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
export default class CreateSnapshotWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		var snapshotNameAvailable = false
		var usedByS3 = false

		function checkIfSnapshotNameIsAvailable(poolName, datasetName, snapshotName) {
			var json = {
				"pool_name": poolName,
				"dataset_name": datasetName,
				"snapshot_name": snapshotName
			}

			webix.ajax().post("/api/storage/snapshots/check", JSON.stringify(json)).then((response) => {
				snapshotNameAvailable = response.json()

				if (snapshotNameAvailable) {
					$$("create_snapshot_form").markInvalid("name", false)
				} else {
					$$("create_snapshot_form").markInvalid("name", "Snapshot with this name already exists")
				}
			})
		}

		function checkIfUsedByS3(dataset_id) {
			webix.ajax().get("/api/storage/filesystems/" + dataset_id + "/services").then(function (data) {
				var serviceInfo = data.json()
				var service = serviceInfo.service

				if (service == "S3") {
					usedByS3 = true
					$$("create_snapshot_form").markInvalid("dataset", "Snapshots are not supported for datasets used by S3 service.")
				} else {
					usedByS3 = false
					$$("create_snapshot_form").markInvalid("dataset", false)
				}
			})
		}

		return {
			view: "window",
			id: "create_snapshot_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Create Snapshot", css: "header_label" }
				],
			},
			body: {
				view: "form",
				css: "allowOverflow",
				id: "create_snapshot_form",
				elements: [
					{
						paddingX: 20,
						rows: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "richselect", id: "createSnapshot_pool", label: "Pool", labelWidth: labelWidth, name: "pool", invalidMessage: "Cannot be empty", on: {
											onChange: function (newv, oldv) {
												if (newv != "") {
													$$("createSnapshot_dataset").setValue("")
													var poolRefId = this.getValue()

													webix.ajax().get("/api/storage/pools/" + poolRefId + "/filesystems").then((response) => {
														var data = response.json()

														var datasetsInfo = data.map((dataset) => {
															return {
																id: dataset.id,
																value: dataset.name
															}
														})

														$$("createSnapshot_dataset").define("options", datasetsInfo)
													})
												}
											}
										}
									},
									{
										view: "richselect", label: "Dataset", labelWidth: labelWidth, name: "dataset", id: "createSnapshot_dataset", invalidMessage: "Cannot be empty", on: {
											onChange: function (newv, oldv) {
												if (newv != "") {
													var dataset_id = this.getValue()
													checkIfUsedByS3(dataset_id)
												}

												if (newv != "" && $$("createSnapshot_name").getValue() != "") {
													checkIfSnapshotNameIsAvailable($$("createSnapshot_pool").getText(), $$("createSnapshot_dataset").getText(), $$("createSnapshot_name").getValue())
												}
											}
										}
									},
									{
										view: "text", label: "Name", labelWidth: labelWidth, id: "createSnapshot_name", name: "name", invalidMessage: "Cannot be empty", on: {
											onChange: function (newv, oldv) {
												if (newv != "" && $$("createSnapshot_dataset").getValue() != "" && $$("createSnapshot_pool").getValue() != "") {
													checkIfSnapshotNameIsAvailable($$("createSnapshot_pool").getText(), $$("createSnapshot_dataset").getText(), $$("createSnapshot_name").getValue())
												}
											}
										}
									},
									{
										view: "text", label: "Comment", labelWidth: labelWidth, id: "createSnapshot_comment", name: "comment"
									},
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													checkIfSnapshotNameIsAvailable($$("createSnapshot_pool").getText(), $$("createSnapshot_dataset").getText(), $$("createSnapshot_name").getValue())
													checkIfUsedByS3($$("createSnapshot_dataset").getValue())
													if ($$("create_snapshot_form").validate() && snapshotNameAvailable && !usedByS3) {
														$$("create_snapshot_window").disable()
														$$("create_snapshot_window").showProgress({
															type: "icon",
															hide: false,
														})

														var json = {
															"name": $$("createSnapshot_name").getValue()
														}
														if ($$("createSnapshot_comment").getValue() != "") {
															json["comment"] = $$("createSnapshot_comment").getValue()
														}

														var datasetRefId = $$("createSnapshot_dataset").getValue()

														webix.ajax().post("/api/storage/filesystems/" + datasetRefId + "/snapshots", JSON.stringify(json)).then((response) => {
															var data = response.json()
															webix.message({ type: "default", text: data, expire: 10000 })

															$$("poolManagementTabSnapshotsDatatable").clearAll()
															$$("poolManagementTabSnapshotsDatatable").load("/api/storage/snapshots")
														}).fail((xhr) => {
															ajaxFail(xhr)
														})

														$$("create_snapshot_window").enable()
														$$("create_snapshot_window").hideProgress()
														this.hideWindow()
													} else {
														return false
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
					"pool": webix.rules.isNotEmpty,
					"dataset": webix.rules.isNotEmpty,
					"name": webix.rules.isNotEmpty,
				}
			},
			on: {
				onShow: () => {
					webix.ajax().get("/api/storage/pools").then((response) => {
						var data = response.json()

						var pools = data.map((pool) => {
							return {
								id: pool.id,
								value: pool.name
							}
						})

						$$("createSnapshot_pool").define("options", pools)
					})
				},
				onHide: () => {
					$$("create_snapshot_form").clear()
					$$("create_snapshot_form").clearValidation()
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
	// init() {
	//     this.ui(CreateDatasetWindow2)
	// }
	init() {
		webix.extend($$("create_snapshot_window"), webix.ProgressBar)
	}
	ready() {
		var networkCreateDatasetWindow = $$("create_snapshot_window")

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
		const CreateDatasetForm = $$("create_snapshot_form")

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