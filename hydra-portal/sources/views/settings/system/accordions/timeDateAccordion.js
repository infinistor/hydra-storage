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

export default class TimeDateAccordion extends JetView {
	config() {
		const labelWidth = 300
		// let timezones = Intl.supportedValuesOf('timeZone')

		return {
			borderless: true,
			rows: [
				{
					view: "form",
					elements: [
						{
							cols: [
								{
									width: 600,
									rows: [
										{
											view: "richselect", id: "timeZone", label: "Time Zone", value: "Asia/Seoul", labelWidth: labelWidth, options: []
										},
										{
											view: "label", label: "Set Time and Date", labelWidth: labelWidth
										},
										{
											view: "form",
											borderless: true,
											paddingY: 0,
											paddingX: 0,
											elements: [
												{
													cols: [
														{
															padding: {
																left: 17, right: 0, top: 0, bottom: 0
															},
															rows: [
																{
																	cols: [
																		{
																			view: "switch", id: "ntpSwitch", label: "Continuous NTP Synchronization", labelWidth: labelWidth - 17, on: {
																				onChange: (newv, oldv) => {
																					if (newv == 1) {
																						$$("ntpServerText").enable()
																						$$("manualSwitch").setValue(0)
																						$$("currentTimePicker").disable()
																						$$("currentDayPicker").disable()
																						$$("nowButton").show()
																						$$("nowButton2").hide()
																					} else {
																						$$("ntpServerText").disable()
																						$$("manualSwitch").setValue(1)
																						$$("currentTimePicker").enable()
																						$$("currentDayPicker").enable()
																						$$("nowButton").hide()
																						$$("nowButton2").show()
																					}
																				}
																			}
																		},
																		{
																			view: "button", value: "Now", id: "nowButton", css: "new_style_primary", hidden: true, width: 50, click: () => {
																				webix.ajax().post("/api/system/time/reset").then(function (data) {
																					webix.message({ type: "success", text: "Time has been synchronized." })
																				}).fail((xhr) => {
																					ajaxFail(xhr)
																				})
																			}
																		}
																	]
																},
																{
																	padding: {
																		left: 17, right: 0, top: 0, bottom: 0
																	},
																	rows: [
																		{
																			view: "text", id: "ntpServerText", label: "NTP Server", value: "0.pool.ntp.org, 1.pool.ntp.org, 2.pool.ntp.org", labelWidth: labelWidth - 17 * 2,
																			inputWidth: 600 - 17 * 2,
																		},
																	]
																},
																{
																	cols: [
																		{
																			view: "switch", id: "manualSwitch", label: "Manual", labelWidth: labelWidth - 17, on: {
																				onChange: (newv, oldv) => {
																					if (newv == 1) {
																						$$("currentTimePicker").enable()
																						$$("currentDayPicker").enable()
																						$$("ntpSwitch").setValue(0)
																						$$("ntpServerText").disable()
																						$$("nowButton").hide()
																						$$("nowButton2").show()
																					} else {
																						$$("currentTimePicker").disable()
																						$$("currentDayPicker").disable()
																						$$("ntpSwitch").setValue(1)
																						$$("ntpServerText").enable()
																						$$("nowButton").show()
																						$$("nowButton2").hide()
																					}
																				}
																			}
																		},
																		{
																			view: "button", value: "Now", id: "nowButton2", css: "new_style_primary", hidden: true, width: 50, click: () => {
																				let now = new Date()
																				$$("currentTimePicker").setValue(now)
																				$$("currentDayPicker").setValue(now)
																			}
																		}
																	]
																},
																{
																	padding: {
																		left: 17, right: 0, top: 0, bottom: 0
																	},
																	rows: [
																		{
																			view: "datepicker", id: "currentTimePicker", type: "time", label: "Current Time", disabled: true, labelWidth: labelWidth - 17 * 2, suggest: {
																				type: "timeboard", body: {
																					button: false,
																					seconds: true,
																				}
																			}
																		},
																		{
																			view: "datepicker", id: "currentDayPicker", label: "Current Date", labelWidth: labelWidth - 17 * 2, disabled: true, value: new Date(), format: "%Y/%m/%d"
																		}
																	]
																}
															]
														}
													]
												}
											]
										},
										{ height: 10 },
										{
											view: "button", value: "Apply", css: "new_style_primary", width: 70, on: {
												onItemClick: () => {
													let ntp_service = $$("ntpSwitch").getValue() == 1 ? "y" : "n"
													let ntp_server_list = $$("ntpServerText").getValue()
													let time_zone = $$("timeZone").getValue()
													let local_time = $$("currentDayPicker").getValue().toISOString().split("T")[0] + " " + $$("currentTimePicker").getValue().toString().split(" ")[4]

													var json_time = {
														"local_time": local_time,
														"time_zone": time_zone,
														"ntp_service": ntp_service,
														"ntp_server_list": ntp_server_list
													}

													// update time settings
													webix.ajax().put("/api/system/time", JSON.stringify(json_time)).then(function (data) {
														webix.message({ type: "success", text: "Time and Date settings updated", expire: 10000 })
													}).fail((xhr) => {
														ajaxFail(xhr)
													})
												}
											}
										}
									]
								},
								{}
							]
						},
					]
				}
			]
		}
	}
	init() {
		const backend_url = this.app.config.backend_url

		webix.ajax().get("/api/system/time/timezones").then(function (data) {
			let timezones = data.json()
			$$("timeZone").define("options", timezones.slice(0, timezones.length - 1))
			$$("timeZone").refresh()
		})
	}
	ready() {
		webix.ajax().get("/api/system/time").then(function (data) {
			let time = data.json()
			$$("timeZone").setValue(time.time_zone)
			$$("ntpSwitch").setValue(time.ntp_service == "active" ? 1 : 0)
			$$("ntpServerText").setValue(time.ntp_server_list != "" ? time.ntp_server_list : "")

			var local_date = new Date(time.local_time.split(" ")[1])
			$$("currentDayPicker").setValue(local_date)
			var local_time = time.local_time.split(" ")[2]
			$$("currentTimePicker").setValue(local_time)
		})

	}
}