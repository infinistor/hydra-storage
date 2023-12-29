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
import CloneSnapshotWindow from "../windows/cloneSnapshot";
import { ajaxFail } from "../../../../functions/ajaxFail";

var cloneSnapshotWindow
export default class SnapshotContextMenu extends JetView {
	config() {
		return {
			view: "contextmenu",
			autowidth: true,
			id: "snapshot_context_menu",
			data: ["Rollback", "Clone", "Delete"],
			on: {
				onItemClick: (id) => {
					var snapshot_id = this.getParam("snapshot_id", true)
					var snapshot_name = this.getParam("snapshot_name", true)
					switch (id) {
						case "Delete":
							webix.confirm({
								title: "Delete snapshot " + snapshot_name,
								text: "Are you sure you want to delete this snapshot?",
								ok: "Yes", cancel: "Cancel",
								width: 300,
								callback: function (result) {
									if (result) {
										webix.ajax().del("/api/storage/snapshots/" + snapshot_id).then(function (data) {
											webix.message({ type: "default", text: "Snapshot " + snapshot_name + " deleted" })
											$$("poolManagementTabSnapshotsDatatable").clearAll()
											$$("poolManagementTabSnapshotsDatatable").load("/api/storage/snapshots")
										}).fail(function (xhr) {
											var response = JSON.parse(xhr.response)
											var error = response.error
											// replace "/n" with "<br>" for new line
											error = error.replace(/\n/g, "<br>")
											webix.message({
												type: "error",
												expire: 10000,
												text: error
											})
										})
									}
								}
							})
							break;
						case "Rollback":
							webix.confirm({
								type: "confirm-warning",
								title: "Rollback to snapshot " + snapshot_name,
								text: "Are you sure you want to rollback to this snapshot? <br>All data created after this snapshot will be lost.",
								ok: "Yes", cancel: "Cancel",
								width: 350,
								callback: function (result) {
									if (result) {
										webix.ajax().post("/api/storage/snapshots/" + snapshot_id + "/rollback").then(function (data) {
											webix.message({
												type: "success",
												text: data.json(),
												expire: 2000
											})

											$$("poolManagementTabSnapshotsDatatable").clearAll()
											$$("poolManagementTabSnapshotsDatatable").load("/api/storage/snapshots")
										}).fail((xhr) => {
											ajaxFail(xhr)
										})
									}
								}
							})
							break;
						case "Clone":
							cloneSnapshotWindow.showWindow()
							break;
					}
				}
			}
		}
	}
	init() {
		cloneSnapshotWindow = this.ui(CloneSnapshotWindow)
	}
}