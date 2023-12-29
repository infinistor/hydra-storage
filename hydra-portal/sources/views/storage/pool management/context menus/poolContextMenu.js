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

import { timedAPI } from "../poolManagementTab";
import { ajaxFail } from "../../../../functions/ajaxFail";
import ModifyPoolWindow from "../windows/modifyPool";

var modifyPoolWindow
export default class PoolContextMenu extends JetView {
	config() {
		return {
			view: "contextmenu",
			width: 110,
			id: "pool_context_menu",
			data: ["Scrub Now", "Export", "Import", "Edit", "Delete"],
			on: {
				onItemClick: (id) => {
					var pool_id = this.getParam("pool_id", true)
					var pool_name = this.getParam("pool_name", true)
					switch (id) {
						case "Delete":
							webix.ajax().get("/api/storage/pools/" + pool_id + "/services").then(function (data) {
								var serviceInfo = data.json()

								var services = serviceInfo.service.split(",")

								// if there is "S3" in the list of services, then we cannot delete the pool
								if (services.includes("S3")) {
									webix.message({
										type: "error",
										text: "Cannot delete pool. There is a dataset in pool that is used by S3 service.",
										expire: 5000
									})
									return
								}

								if (serviceInfo.used) {
									webix.prompt({
										title: "Delete Pool " + pool_name,
										type: "prompt-error",
										text: "<div>There are datasets that are used by SMB, NFS, or S3 services.</div><div>To proceed, please type the pool name below.</div>",
										ok: "Yes", cancel: "Cancel",
										input: {
											required: true,
										},
										width: 350,
										callback: (result) => {
											if (result == pool_name) {
												webix.ajax().del("/api/storage/pools/" + pool_id).then((data) => {
													clearTimeout(timedAPI)

													$$("poolManagementTabRightView").hide()
													$$("poolManagementTabNoPoolSelectedView").show()

													$$("pools_datatable").load("/api/storage/pools")

													webix.message({
														type: "success",
														text: data.json(),
														expire: 2000
													})
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
										title: "Delete Pool " + pool_name,
										ok: "Yes", cancel: "Cancel",
										text: "Are you sure you want to delete this pool?",
										callback: (result) => {
											if (result) {
												webix.ajax().del("/api/storage/pools/" + pool_id).then((data) => {
													clearTimeout(timedAPI)

													$$("poolManagementTabRightView").hide()
													$$("poolManagementTabNoPoolSelectedView").show()

													$$("pools_datatable").load("/api/storage/pools")

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
							modifyPoolWindow.showWindow(pool_id)
							break;
						case "Scrub Now":
							webix.ajax().post("/api/storage/pools/" + pool_id + "/scrub-now").then((data) => {
								webix.message({
									type: "success",
									text: data.json(),
									expire: 2000
								})
							}).fail((xhr) => {
								ajaxFail(xhr)
							})
							break;
						case "Export":
							webix.ajax().get("/api/storage/pools/" + pool_id + "/services").then(function (data) {
								var serviceInfo = data.json()

								var services = serviceInfo.service.split(",")

								// if there is "S3" in the list of services, then we cannot delete the pool
								if (services.includes("S3")) {
									webix.message({
										type: "error",
										text: "Cannot export pool. There is a dataset in pool that is used by S3 service.",
										expire: 5000
									})
									return
								}

								if (serviceInfo.used) {
									webix.prompt({
										title: "Export Pool " + pool_name,
										type: "prompt-error",
										text: "<div>There are datasets that are used by SMB or NFS services.</div><div>These services will be automatically disabled.</div><div>To proceed, please type the pool name below.</div>",
										ok: "Yes", cancel: "Cancel",
										input: {
											required: true,
										},
										width: 350,
										callback: (result) => {
											if (result == pool_name) {
												webix.ajax().post("/api/storage/pools/" + pool_id + "/export").then((data) => {
													webix.message({
														type: "success",
														text: data.json(),
														expire: 2000
													})
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
										title: "Export Pool " + pool_name,
										ok: "Yes", cancel: "Cancel",
										text: "Are you sure you want to export this pool?",
										callback: (result) => {
											if (result) {
												webix.ajax().post("/api/storage/pools/" + pool_id + "/export").then((data) => {
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
						case "Import":
							webix.ajax().post("/api/storage/pools/" + pool_id + "/import").then((data) => {
								webix.message({
									type: "success",
									text: data.json(),
									expire: 2000
								})
							}).fail((xhr) => {
								ajaxFail(xhr)
							}
							)
							break;
					}
				},
				onBeforeShow: () => {
					var pool_health = this.getParam("pool_health", true)
					if (pool_health == "Exported") {
						// leave only "Import" and "Delete" menu item
						$$("pool_context_menu").showMenuItem("Import")
						$$("pool_context_menu").showMenuItem("Delete")
						$$("pool_context_menu").hideMenuItem("Scrub Now")
						$$("pool_context_menu").hideMenuItem("Export")
						$$("pool_context_menu").hideMenuItem("Edit")
					} else if (pool_health == "Missing" || pool_health == "Removing") {
						// hide all menu items
						return false
					} else {
						$$("pool_context_menu").hideMenuItem("Import")
						$$("pool_context_menu").hideMenuItem("Delete")
						$$("pool_context_menu").showMenuItem("Scrub Now")
						$$("pool_context_menu").showMenuItem("Export")
						$$("pool_context_menu").showMenuItem("Edit")
					}
				}
			}
		}
	}
	init() {
		modifyPoolWindow = this.ui(ModifyPoolWindow)
	}
}