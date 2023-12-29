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
export default class PoolDetailsWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		var poolRefId

		function reloadStatus(poolRefId) {
			$$("pool_details_tree").clearAll()
			$$("pool_details_tree").load("/api/storage/pools/" + poolRefId + "/status").then(() => {
				var tree_length = $$("pool_details_tree").serialize().length
				if (tree_length < 4) {
					var diskGroup = $$("pool_details_tree").serialize().map((item) => {
						return item.value
					})

					// if there is no log, cache or spare disk group, add them
					if (!diskGroup.includes("JOURNAL")) {
						// get the id of the last item
						var lastId = $$("pool_details_tree").serialize().length + 1
						$$("pool_details_tree").add({ id: lastId.toString(), value: "JOURNAL", status: "", read: "", write: "", cksum: "", comment: "", data: [{}] })
					}
					if (!diskGroup.includes("CACHE")) {
						var lastId = $$("pool_details_tree").serialize().length + 1
						$$("pool_details_tree").add({ id: lastId.toString(), value: "CACHE", status: "", read: "", write: "", cksum: "", comment: "", data: [{}] })
					}
					if (!diskGroup.includes("SPARES")) {
						var lastId = $$("pool_details_tree").serialize().length + 1
						$$("pool_details_tree").add({ id: lastId.toString(), value: "SPARES", status: "", read: "", write: "", cksum: "", comment: "", data: [{}] })
					}
				}
			})
		}

		return {
			view: "window",
			id: "pool_details_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Disk Configration", css: "header_label", id: "poolDetails_label" }
				],
			},
			body: {
				view: "form",
				elements: [
					{
						// paddingX: 20,
						rows: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "treetable", id: "pool_details_tree", scroll: "y", autoheight: true, borderless: true, headerRowHeight: 24, columns: [
											{
												id: "value", header: "Name", adjust: "data", template: "{common.treetable()} #value#"
											},
											{
												id: "add", header: "", template: (obj) => {
													// level 1 && disk groups that are mirrors
													if ((obj.id.length == 1) || (obj.id.length == 3 && obj.id[0] == "1" && obj.value.indexOf("Mirror") != -1)) {
														return `<button type="button" class="hoverButton webix_icon_button">
                                                            <span class="webix_icon wxi-plus-circle"></span>
                                                        </button>`
													} else {
														return ""
													}
												}, width: 30
											},
											{
												id: "status", header: "Status", fillspace: true, template: function (obj) {
													if (obj.status == "ONLINE") {
														return "<span style='color: #00c900'>" + obj.status + "</span>"
													} else if (obj.status == "AVAIL" || obj.status == "INUSE") {
														return "<span style='color: #6493ff'>" + obj.status + "</span>"
													} else {
														return "<span style='color:red'>" + obj.status + "</span>"
													}
												}
											},
											{ id: "read", header: "Read", adjust: true },
											{ id: "write", header: "Write", adjust: true },
											{ id: "cksum", header: "Checksum", adjust: true },
											{ id: "comment", header: "", adjust: true },
											{
												id: "delete", header: "", width: 40, template: (obj) => {
													// can remove separate disks in logs, cache and spares
													// as well as disk groups that are not the only one
													if (obj.id.length == 3 && obj.id[0] != "1") {
														return `<button type="button" class="hoverButton webix_icon_button">
                                                        <span class="webix_icon wxi-trash"></span>
                                                    </button>`
													} else if (obj.id.length == 3 && obj.id[0] == "1" && obj.id != "1.1" && obj.value.indexOf("RAID") == -1) {
														return `<button type="button" class="hoverButton webix_icon_button">
                                                        <span class="webix_icon wxi-trash"></span>
                                                    </button>`
													} else {
														return ""
													}
												}
											}
										], onClick: {
											"hoverButton": function (e, id, trg) {
												var item = $$("pool_details_tree").getItem(id)
												if (id.column == "add") {
													if (item.value === "DATA") {
														$$("add_group_window").show()
													} else if (item.value === "JOURNAL") {
														$$("add_log_window").show()
													} else if (item.value === "CACHE") {
														$$("add_cache_window").show()
													} else if (item.value === "SPARES") {
														$$("add_spare_window").show()
													}
												} else if (id.column == "delete") {
													if (item.id[0] === "1" && item.id != "1.1" && item.value.indexOf("RAID") == -1) {
														// if disk group in data
														var json = {
															"diskGroupName": item.value.toLowerCase(),
															"disks": []
														}

														var childId = this.data.getFirstChildId(item.id)
														while (childId) {
															var child = this.getItem(childId)
															json.disks.push(child.value)
															childId = this.data.getNextSiblingId(childId)
														}

														webix.confirm({
															title: "Remove Disk Group",
															text: "Are you sure you want to remove this disk group?",
															ok: "Yes", cancel: "Cancel",
															callback: (result) => {
																if (result) {
																	webix.ajax().del("/api/storage/pools/" + poolRefId + "/diskgroups", JSON.stringify(json)).then((response) => {
																		webix.message({
																			type: "success",
																			text: response.json(),
																			expire: 2000
																		})

																		reloadStatus(poolRefId)
																	}).fail((xhr) => {
																		ajaxFail(xhr)
																	})
																}
															}
														})
													} else {
														var parent = $$("pool_details_tree").getItem(item.id[0])
														var parentCategory = parent.value

														var json = {
															"diskGroupName": "",
														}

														parentCategory == "JOURNAL" ? parentCategory = "log" : parentCategory == "CACHE" ? parentCategory = "cache" : parentCategory = "spare"

														// show warning
														if (parentCategory) {
															webix.confirm({
																title: "Remove Log",
																text: "Are you sure you want to remove this " + parentCategory + " disk?",
																ok: "Yes", cancel: "Cancel",
																callback: (result) => {
																	if (result) {
																		json["disks"] = [item.value]
																		webix.ajax().del("/api/storage/pools/" + poolRefId + "/diskgroups", JSON.stringify(json)).then((response) => {
																			webix.message({
																				type: "success",
																				text: response.json(),
																				expire: 2000
																			})
																			reloadStatus(poolRefId)
																		}).fail((xhr) => {
																			ajaxFail(xhr)
																		})
																	}
																}
															})
														}
													}
												}
											},
										}
									},
									{},
									{
										cols: [
											{
												view: "button", value: "Close", css: "new_style_button", width: 70, click: () => {
													this.hideWindow()
												}
											},
										]
									},
								]
							},
						]
					},
				]
			},
			on: {
				onShow: () => {
					poolRefId = this.getParam("pool_id", true)

					webix.ajax().get("/api/storage/pools/" + poolRefId).then((response) => {
						var data = response.json()
						var poolName = data.name
						$$("poolDetails_label").setValue("Disk Configuration of " + poolName)
					})

					reloadStatus(poolRefId)
				},
				onHide: () => {
					$$("pool_details_tree").clearAll()
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
	ready() {
		var networkCreateDatasetWindow = $$("pool_details_window")

		webix.UIManager.addHotKey("esc", function () {
			if (networkCreateDatasetWindow.isVisible())
				networkCreateDatasetWindow.hide()
		})
	}
	showWindow() {
		this.getRoot().show()
	}
	hideWindow() {
		this.getRoot().hide()
	}
}