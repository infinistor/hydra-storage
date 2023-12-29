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
import ModifyDatasetWindow from "../windows/modifyDataset";
import { ajaxFail } from "../../../../functions/ajaxFail";

var modifyDatasetWindow
export default class DatasetContextMenu extends JetView {
	config() {
		return {
			view: "contextmenu",
			id: "zfs_dataset_context_menu",
			autowidth: true,
			data: ["Edit", "Delete"],
			on: {
				onItemClick: (id) => {
					var pool_id = this.getParam("pool_id", true)
					var dataset_id = this.getParam("dataset_id", true)
					var dataset_name = this.getParam("dataset_name", true)

					switch (id) {
						case "Delete":
							// check if this dataset is being used by any service (SMB, NFS, S3)
							// if it is, show a warning message
							webix.ajax().get("/api/storage/filesystems/" + dataset_id + "/services").then(function (data) {
								var serviceInfo = data.json()


								if (serviceInfo.used) {
									var services = serviceInfo.service.split(",")

									if (services.includes("S3")) {
										webix.message({
											type: "error",
											text: "Cannot delete dataset. This dataset is being used by the S3 service.",
											expire: 5000
										})
										return
									}

									webix.prompt({
										title: "Delete Dataset " + dataset_name,
										type: "prompt-error",
										text: "<div>This dataset is being used by the " + services.join(", ") + " service(s).</div><div>To proceed, please type the dataset name below.</div>",
										ok: "Yes", cancel: "Cancel",
										input: {
											required: true,
										},
										width: 300,
										callback: function (result) {
											if (result == dataset_name) {
												webix.ajax().del("/api/storage/pools/" + pool_id + "/filesystems/" + dataset_id).then(function (data) {
													webix.message({
														type: "success",
														text: data.json(),
														expire: 2000
													})
													$$("poolManagementTabDatasetsDatatable").remove(dataset_id)
												}).fail((xhr) => {
													ajaxFail(xhr)
												})
											} else if (result) {
												webix.message({
													type: "error",
													text: "Wrong input. Try again.",
													expire: 2000
												})
											}
										}
									})
								} else {
									webix.confirm({
										title: "Delete Dataset " + dataset_name,
										ok: "Yes", cancel: "Cancel",
										text: "Are you sure you want to delete this dataset?",
										callback: function (result) {
											if (result) {
												webix.ajax().del("/api/storage/pools/" + pool_id + "/filesystems/" + dataset_id).then(function (data) {
													$$("poolManagementTabDatasetsDatatable").remove(dataset_id)

													webix.message({
														type: "success",
														text: data.json(),
														expire: 2000
													})
												}).fail((xhr) => {
													ajaxFail(xhr)
												})
											}
										}
									})
								}
							})

							break;
						case "Edit":
							modifyDatasetWindow.showWindow()
							break;
					}
				}
			}
		}
	}
	init() {
		modifyDatasetWindow = this.ui(ModifyDatasetWindow)
	}
}