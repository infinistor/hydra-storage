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
import DiskReplacementWindow from "../windows/diskReplacement";

var replaceDiskWindow
export default class DiskContextMenu extends JetView {
	config() {
		var baseView = this
		var parentCategory
		var deleteJSON

		return {
			view: "contextmenu",
			id: "disk_context_menu",
			autowidth: true,
			data: ["Replace", "Delete"],
			on: {
				onItemClick: (id) => {
					var pool_id = this.getParam("pool_id", true)

					switch (id) {
						case "Replace":
							replaceDiskWindow.showWindow()
							break;
						case "Delete":
							if (parentCategory) {
								webix.confirm({
									title: "Remove " + parentCategory.charAt(0).toUpperCase() + parentCategory.slice(1),
									text: "Are you sure you want to remove this " + parentCategory + " disk?",
									ok: "Yes", cancel: "Cancel",
									callback: (result) => {
										if (result) {
											webix.ajax().del("/api/storage/pools/" + pool_id + "/diskgroups", JSON.stringify(deleteJSON)).then((response) => {
												webix.message({
													type: "success",
													text: response.json(),
													expire: 2000,
												})

												$$("pool_details_tree").clearAll()
												$$("pool_details_tree").load("/api/storage/pools/" + pool_id + "/status")
											}).fail((xhr) => {
												ajaxFail(xhr)
											})
										}
									}
								})
							} else {
								webix.confirm({
									title: "Remove Disk Group",
									text: "Are you sure you want to remove this disk group?",
									ok: "Yes", cancel: "Cancel",
									callback: (result) => {
										if (result) {
											webix.ajax().del("/api/storage/pools/" + pool_id + "/diskgroups", JSON.stringify(deleteJSON)).then((response) => {
												webix.message({
													type: "success",
													text: response.json(),
													expire: 5000,
												})
												$$("pool_details_tree").clearAll()
												$$("pool_details_tree").load("/api/storage/pools/" + pool_id + "/status")
											}).fail((xhr) => {
												ajaxFail(xhr)
											})
										}
									}
								})
							}
							break;
					}
				},
				onBeforeShow: function () {
					deleteJSON = baseView.getParam("delete_json", true)
					parentCategory = baseView.getParam("parent_category", true)
					if (!deleteJSON) {
						// hide delete option
						this.hideMenuItem("Delete")
					} else {
						this.showMenuItem("Delete")
					}
				}
			}
		}
	}
	init() {
		replaceDiskWindow = this.ui(DiskReplacementWindow)
	}
}