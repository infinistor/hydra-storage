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
import AddConfigurationContextMenu from "./context menus/addConfigurationContextMenu";
import ConfigurationTab from "./pool tabs/configurationTab";
import DatasetsTab from "./pool tabs/datasetsTab";
import ScrubTab from "./pool tabs/scrubTab";

export default class PoolManagementRightTab extends JetView {
	config() {
		return {
			padding: {
				top: 0, right: 0, left: 15, bottom: 0
			},
			id: "poolManagementTabRightView",
			hidden: true,
			rows: [
				{
					id: "poolManagementTabFailedPoolStatus",
					padding: {
						top: 0, right: 0, left: 0, bottom: 15
					},
					rows: [
						{
							view: "toolbar", borderless: true, css: {
								"background-color": "#d71919",
							}, elements: [
								{
									view: "template", autoheight: true, css: {
										"background-color": "#d71919",
									}, id: "poolManagementTabFailedPoolStatusLabel"
								}
							],
						},
					], hidden: true
				},
				{
					height: 100,
					padding: {
						top: 0, right: 0, left: 0, bottom: 15
					},
					cols: [
						{
							view: "toolbar", borderless: true, elements: [
								{
									cols: [
										{
											rows: [
												{},
												{
													rows: [
														{
															view: "label",
															id: "poolManagementTabPoolStatus",
															height: 25,
															align: "center",
														},
														{
															view: "label",
															id: "poolManagementTabPoolStatusColor",
															height: 20,
															align: "center",
														}
													]
												},
												{},
											]
										},
										{
											rows: [
												{},
												{
													rows: [
														{
															view: "label",
															id: "poolManagementTabPoolRedundancy",
															height: 25,
															align: "center",
														},
														{
															view: "label",
															id: "poolManagementTabPoolRedundancyLabel",
															height: 20,
															align: "center",
														}
													]
												},
												{},
											]
										},
										{
											rows: [
												{},
												{
													rows: [
														{
															view: "label",
															id: "poolManagementTabPoolDedup",
															height: 25,
															align: "center",
														},
														{
															view: "label",
															id: "poolManagementTabPoolDedupLabel",
															height: 20,
															align: "center",
														}
													]
												},
												{},
											]
										},
										{
											rows: [
												{},
												{
													rows: [
														{
															view: "label",
															id: "poolManagementTabPoolCompression",
															height: 25,
															align: "center",
														},
														{
															view: "label",
															id: "poolManagementTabPoolCompressionLabel",
															height: 20,
															align: "center",
														}
													]
												},
												{},
											]
										}
									]
								}
							]
						},
						{
							width: 15,
						},
						{
							view: "toolbar", borderless: true, elements: [
								{
									cols: [
										{
											// chart
											view: "chart",
											id: "poolManagementTabPoolChart",
											borderless: true,
											type: "donut",
											value: "#percent#",
											color: "#color#",
											shadow: 0,
											radius: 30,
										},
										{
											rows: [
												{},
												{
													rows: [
														{
															view: "label",
															id: "poolManagementTabPoolSize",
															height: 25,
															align: "center",
														},
														{
															view: "label",
															id: "poolManagementTabPoolSizeLabel",
															height: 20,
															align: "center",
														}
													]
												},
												{},
											]
										},
										{
											rows: [
												{},
												{
													rows: [
														{
															view: "label",
															id: "poolManagementTabPoolAllocated",
															height: 25,
															align: "center",
														},
														{
															view: "label",
															id: "poolManagementTabPoolAllocatedLabel",
															height: 20,
															align: "center",
														}
													]
												},
												{},
											]
										},
										{
											rows: [
												{},
												{
													rows: [
														{
															view: "label",
															id: "poolManagementTabPoolFree",
															height: 25,
															align: "center",
														},
														{
															view: "label",
															id: "poolManagementTabPoolFreeLabel",
															height: 20,
															align: "center",
														}
													]
												},
												{},
											]
										},
										{
											rows: [
												{},
												{
													rows: [
														{
															view: "label",
															id: "poolManagementTabPoolAvailable",
															height: 25,
															align: "center",
														},
														{
															view: "label",
															id: "poolManagementTabPoolAvailableLabel",
															height: 20,
															align: "center",
														}
													]
												},
												{},
											]
										}
									]
								}
							]
						}
					]
				},
				{
					id: "poolManagementTabScanResult",
					padding: {
						top: 0, right: 0, left: 0, bottom: 15
					},
					rows: [
						{
							view: "toolbar", borderless: true, css: {
								// "background-color": "#d71919",
							}, elements: [
								{
									view: "template", autoheight: true, css: {
										// "background-color": "#d71919",
									}, id: "poolManagementTabScanResultLabel"
								}
							],
						},
					], hidden: true
				},
				{
					view: "tabview",
					tabbar: {
						optionWidth: 120,
						borderless: true,
					},
					cells: [
						{
							header: "Configuration",
							body: ConfigurationTab
						},
						{
							header: "Datasets",
							body: DatasetsTab
						},
						{
							header: "Data Scrub",
							body: ScrubTab
						}
					]
				},
			]
		}
	}
	init() {
		this.ui(AddConfigurationContextMenu)
	}
}