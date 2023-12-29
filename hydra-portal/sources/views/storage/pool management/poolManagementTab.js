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
import PoolManagementRightTab from "./poolManagementRightTab";
import PoolContextMenu from "./context menus/poolContextMenu";
import AddPoolContextMenu from "./context menus/addPoolContextMenu";

import { getTimeInterval } from "../../../functions/timeIntervalForPoolManagement";

export var timedAPI
var timedPoolsAPI
export default class PoolManagementTab extends JetView {
	config() {
		var baseView = this

		var sparklinePercents = webix.Sparklines.getTemplate({
			type: "pie",
			donut: true,
			innerRadius: 7,
			color: function (ind, dataArr) {
				// white or red sector for 100-value
				if (!ind) {
					return "#00c900";
				};
				return "#D9D8D7";
			}
		});

		function startPeriodicRequest(selectedItemId) {
			getPoolStatus(selectedItemId)
			getScrubStatus(selectedItemId)

			timedAPI = setTimeout(() => {
				startPeriodicRequest(selectedItemId);
			}, getTimeInterval());
		}

		function getPoolStatus(selectedItemId) {
			webix.ajax().get("/api/storage/pools/" + selectedItemId).then(function (data) {
				var selectedPool = data.json()

				if (selectedPool.health != "ONLINE") {
					webix.ajax().get("/api/storage/pools/" + selectedItemId + "/failed-status").then(function (data) {
						$$("poolManagementTabRightView").show()
						$$("poolManagementTabNoPoolSelectedView").hide()

						$$("poolManagementTabFailedPoolStatus").show()
						var style = `
                            font-size: 130%;
                            color: white;
                            font-weight: 500;
                        `
						$$("poolManagementTabFailedPoolStatusLabel").setHTML(`<div style='${style}'>${data.json()}</div>`)
					}).fail(xhr => {
						$$("poolManagementTabRightView").hide()
						$$("poolManagementTabNoPoolSelectedView").show()
					})
				} else if (selectedPool.health == "ONLINE") {
					$$("poolManagementTabRightView").show()
					$$("poolManagementTabNoPoolSelectedView").hide()

					$$("poolManagementTabFailedPoolStatus").hide()
				}
				setPoolStatus(selectedPool)
			}).fail(xhr => {
				$$("poolManagementTabRightView").hide()
				$$("poolManagementTabNoPoolSelectedView").show()
			})
		}

		function getScrubStatus(selectedItemId) {
			webix.ajax().get("/api/storage/pools/" + selectedItemId + "/scrub").then(data => {
				$$("poolManagementTabScrubDatatable").load("/api/storage/pools/" + selectedItemId + "/scrub-history")
				var scrubStatus = data.json()

				var style = `
                    padding: 3px 5px;
                    border-radius: 10px;
                    border: #1ca1c1 solid 1.5px;
                    font-size: 100%;
                    color: #1ca1c1;
                `

				if (scrubStatus.last_run != "") {
					$$("poolManagementTabScrubLastRun").setHTML(`<span style="${style}">Last run: ${scrubStatus.last_run}</span>`)
					$$("poolManagementTabScrubLastRun").show()
				} else {
					$$("poolManagementTabScrubLastRun").hide()
				}

				if (scrubStatus.next_run != "") {
					$$("poolManagementTabScrubNextRun").setHTML(`<span style="${style}">Next run: ${scrubStatus.next_run}</span>`)
					$$("poolManagementTabScrubNextRun").show()
				} else {
					$$("poolManagementTabScrubNextRun").hide()
				}

				if (scrubStatus.status != "") {
					$$("poolManagementTabScanResultLabel").setHTML(`<span>${scrubStatus.status}</span>`)
					$$("poolManagementTabScanResult").show()
				} else {
					$$("poolManagementTabScanResult").hide()
				}
			}).fail(xhr => {
				$$("poolManagementTabScrubLastRun").hide()
				$$("poolManagementTabScrubNextRun").hide()
				$$("poolManagementTabScanResult").hide()
			})
		}

		function setPoolStatus(selectedPool) {
			var healthColor = "#00c900"
			if (selectedPool.health != "ONLINE") {
				healthColor = "#ff0000"
			}
			var healthStyle = `
                font-size: 120%;
                color: ${healthColor};
            `
			$$("poolManagementTabPoolStatus").setValue(`<span style='${healthStyle}'>${selectedPool.health}</span>`)
			$$("poolManagementTabPoolStatusColor").setValue(`<span style='color: ${healthColor}; font-weight: 400;'>State</span>`)

			var normalStyle = `
                font-size: 120%;
            `

			var labelStyle = `
                font-weight: 400;
                color: rgb(191, 191, 191);
            `

			var redundancy
			if (selectedPool.configuration.indexOf("raidz2") != -1) {
				redundancy = selectedPool.configuration.replace("raidz2", "RAID6")
			} else if (selectedPool.configuration.indexOf("raidz") != -1) {
				redundancy = selectedPool.configuration.replace("raidz", "RAID5")
			} else {
				// capitalize first letter
				redundancy = selectedPool.configuration[0].toUpperCase() + selectedPool.configuration.slice(1)
			}

			$$("poolManagementTabPoolRedundancy").setValue(`<span style='${normalStyle}'>${redundancy}</span>`)
			$$("poolManagementTabPoolRedundancyLabel").setValue(`<span style='${labelStyle}'>Redundancy</span>`)

			var dedupColor
			var dedup = selectedPool.dedup
			if (dedup == "off") {
				dedup = "N/A"
				dedupColor = "rgb(191, 191, 191)"
			} else {
				dedup = "On"
				dedupColor = "#00c900"
			}

			$$("poolManagementTabPoolDedup").setValue(`<span style='${normalStyle} color: ${dedupColor}'>${dedup}</span>`)
			$$("poolManagementTabPoolDedupLabel").setValue(`<span style='${labelStyle}'>Deduplication</span>`)

			var compressionColor
			var compression = selectedPool.compression
			if (compression == "off") {
				compression = "N/A"
				compressionColor = "rgb(191, 191, 191)"
			} else {
				compression = "On"
				compressionColor = "#00c900"
			}

			var chartData = [
				{
					"percent": selectedPool.available_and_allocated_ratio,
					"color": "#00c900"
				},
				{
					"percent": 100 - selectedPool.available_and_allocated_ratio,
					"color": "#D9D8D7"
				}
			]

			$$("poolManagementTabPoolChart").clearAll()
			$$("poolManagementTabPoolChart").parse(chartData)

			$$("poolManagementTabPoolCompression").setValue(`<span style='${normalStyle} color: ${compressionColor};'>${compression}</span>`)
			$$("poolManagementTabPoolCompressionLabel").setValue(`<span style='${labelStyle}'>Compression</span>`)

			// slice off the last character (the 'G')
			var size = selectedPool.size.slice(0, -1)
			var sizeMetric = selectedPool.size.slice(-1) == "M" ? "MiB" : selectedPool.size.slice(-1) == "T" ? "TiB" : selectedPool.size.slice(-1) == "T" ? "KiB" : "GiB"
			$$("poolManagementTabPoolSize").setValue(`<span style='${normalStyle}'>${size}</span><span style='font-size:90%;'>${sizeMetric}</span>`)
			$$("poolManagementTabPoolSizeLabel").setValue(`<span style='${labelStyle}'>Size</span>`)

			var allocated = selectedPool.alloc.slice(0, -1)
			var allocatedMetric = selectedPool.alloc.slice(-1) == "M" ? "MiB" : selectedPool.alloc.slice(-1) == "T" ? "TiB" : selectedPool.alloc.slice(-1) == "T" ? "KiB" : "GiB"
			$$("poolManagementTabPoolAllocated").setValue(`<span style='${normalStyle}'>${allocated}</span><span style='font-size:90%;'>${allocatedMetric}</span>`)
			$$("poolManagementTabPoolAllocatedLabel").setValue(`<span style='${labelStyle}'>Allocated</span>`)

			var free = selectedPool.free.slice(0, -1)
			var freeMetric = selectedPool.free.slice(-1) == "M" ? "MiB" : selectedPool.free.slice(-1) == "T" ? "TiB" : selectedPool.free.slice(-1) == "T" ? "KiB" : "GiB"
			$$("poolManagementTabPoolFree").setValue(`<span style='${normalStyle}'>${free}</span><span style='font-size:90%;'>${freeMetric}</span>`)
			$$("poolManagementTabPoolFreeLabel").setValue(`<span style='${labelStyle}'>Free</span>`)

			var available = selectedPool.available.slice(0, -1)
			var availableMetric = selectedPool.available.slice(-1) == "M" ? "MiB" : selectedPool.available.slice(-1) == "T" ? "TiB" : selectedPool.available.slice(-1) == "T" ? "KiB" : "GiB"
			$$("poolManagementTabPoolAvailable").setValue(`<span style='${normalStyle}'>${available}</span><span style='font-size:90%;'>${availableMetric}</span>`)
			$$("poolManagementTabPoolAvailableLabel").setValue(`<span style='${labelStyle}'>Available(User)</span>`)
		}

		return {
			id: "poolManagementTab",
			borderless: true,
			rows: [
				{ height: 15 },
				{
					type: "line", padding: {
						top: 0, right: 15, left: 15, bottom: 15
					},
					rows: [
						{
							cols: [
								{
									width: 250,
									rows: [
										{
											view: "toolbar", borderless: true, elements: [
												{ width: 3 },
												{ view: "label", label: "Storage Pools", css: "header_label" },
												{},
												{
													view: "icon", id: "add_icon", icon: "mdi mdi-plus", css: "icon-button",
													click: () => {
														$$("add_pool_context_menu").show($$("add_icon").getNode())
													}
												},
												{
													margin: 0,
													width: 1
												}
											]
										},
										{
											view: "datatable",
											id: "pools_datatable",
											css: "storage_datatable",
											header: false,
											rowHeight: 35,
											borderless: true,
											autoheight: true,
											select: "row",
											scroll: "y",
											columns: [
												{ id: "name", header: "Name", fillspace: true },
												{
													id: "health", header: "Health", adjust: true, template(obj) {
														if (!obj.health) {
															return ""
														}

														var style = `
                                                        padding: 1px 3px;
                                                        border-radius: 10px;
                                                        border: transparent solid 1.5px;
                                                        font-size: 80%;
                                                    `
														// ONLINE --> Online
														obj.health = obj.health.charAt(0).toUpperCase() + obj.health.slice(1).toLowerCase()
														// if online, return green
														if (obj.health == "Online") {
															return `<span style='color: #00c900; ${style} border-color: #00c900'>${obj.health}</span>`
														} else if (obj.health == "Exported") {
															return `<span style='color: #1ca1c1; ${style} border-color: #1ca1c1'>${obj.health}</span>`
														} else {
															return `<span style='color: #ff0000; ${style} border-color: #ff0000'>${obj.health}</span>`
														}
													}
												},
												{
													id: "available_and_allocated_ratio", header: "Available/Size Space", width: 42, template: function (obj) {
														var dataArr = [obj.available_and_allocated_ratio, 100 - obj.available_and_allocated_ratio]
														return sparklinePercents(dataArr, { width: 42, height: 42 })
													}
												}
											],
											on: {
												onAfterLoad: function () {
													if (this.count() == 0) {
														this.hide()
														$$("noPoolsLabel").show()
													} else {
														this.show()
														$$("noPoolsLabel").hide()
													}
												},
												onAfterSelect: function (selection) {
													clearTimeout(timedAPI);

													baseView.setParam("pool_id", selection.id, false)

													$$("poolManagementTabRightView").show()
													$$("poolManagementTabNoPoolSelectedView").hide()

													var selectedItem = this.getItem(selection.id)

													$$("dataset_search").setValue("")
													$$("poolManagementTabDatasetsDatatable").filterByAll()

													$$("poolManagementTabDatasetsDatatable").clearAll()
													$$("poolManagementTabDatasetsDatatable").load("/api/storage/pools/" + selectedItem.id + "/filesystems")

													$$("pool_details_tree").clearAll()
													$$("pool_details_tree").load("/api/storage/pools/" + selectedItem.id + "/status")

													$$("poolManagementTabScrubDatatable").clearAll()
													$$("poolManagementTabScrubDatatable").load("/api/storage/pools/" + selectedItem.id + "/scrub-history")

													startPeriodicRequest(selectedItem.id)
												},
												onBeforeContextMenu: function (id, event, target) {
													var clickedItem = this.getItem(id)
													baseView.setParam("pool_id", clickedItem.id, false)
													baseView.setParam("pool_name", clickedItem.name, false)
													baseView.setParam("pool_health", clickedItem.health, false)
												}
											}
										},
										{
											view: "toolbar", borderless: true, elements: [
												{
													rows: [
														{
															view: "label",
															id: "noPoolsLabel",
															label: "No pools found",
															hidden: true,
															align: "center"
														},
														{}
													]
												}
											]
										}
									]
								},
								PoolManagementRightTab,
								{
									id: "poolManagementTabNoPoolSelectedView",
									rows: [
										{}
									]
								}
							]
						}
					]
				},
			]
		}
	}
	init() {
		this.ui(PoolContextMenu)
		this.ui(AddPoolContextMenu)

		$$("pool_context_menu").attachTo($$("pools_datatable"))

		this.startPeriodicRequest()
	}
	destroy() {
		clearTimeout(timedAPI);
		clearTimeout(timedPoolsAPI);
	}
	startPeriodicRequest() {
		this.updatePoolTable()

		timedPoolsAPI = setTimeout(() => {
			this.startPeriodicRequest();
		}, getTimeInterval());
	}
	updatePoolTable() {
		$$("pools_datatable").load("/api/storage/pools")
	}
}