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

import { isKeyValidNumber } from "../../../../functions/validation";

const windowWidth = 600;
export default class CreateScrubScheduleWindow extends JetView {
	config() {
		const topBar = 48
		const labelWidth = 200

		var poolRefId

		return {
			view: "window",
			id: "create_scrub_window",
			move: false,
			modal: true,
			width: windowWidth,
			head: {
				view: "toolbar", cols: [
					{ width: 5 },
					{ view: "label", label: "Scheduler", css: "header_label" }
				],
			},
			body: {
				view: "form",
				css: "allowOverflow",
				id: "create_scrub_form",
				elements: [
					{
						paddingX: 20,
						rows: [
							{
								width: windowWidth - 40,
								rows: [
									{
										view: "richselect", id: "createScrub_repeatPattern", label: "Repeat pattern:", labelWidth: labelWidth, value: "2", options: [
											{ id: "1", value: "Off" },
											{ id: "2", value: "Daily" },
											{ id: "3", value: "Weekly" },
											{ id: "4", value: "Monthly" },
											{ id: "5", value: "Yearly" },
										], on: {
											onChange: function () {
												var value = this.getValue()
												if (value == "1") {
													// hide all
													$$("createScrub_repeatDay").hide()
													$$("createScrub_dayOfWeek").hide()
													$$("createScrub_monthOfYear").hide()
													$$("createScrub_dayOfMonth").hide()
													$$("createScrub_time").hide()
												} else if (value == "2") {
													$$("createScrub_repeatDay").show()
													$$("createScrub_dayOfWeek").hide()
													$$("createScrub_monthOfYear").hide()
													$$("createScrub_dayOfMonth").hide()
													$$("createScrub_time").show()
												} else if (value == "3") {
													$$("createScrub_repeatDay").hide()
													$$("createScrub_dayOfWeek").show()
													$$("createScrub_monthOfYear").hide()
													$$("createScrub_dayOfMonth").hide()
													$$("createScrub_time").show()
												} else if (value == "4") {
													$$("createScrub_repeatDay").hide()
													$$("createScrub_dayOfWeek").hide()
													$$("createScrub_monthOfYear").hide()
													$$("createScrub_dayOfMonth").show()
													$$("createScrub_time").show()
												} else if (value == "5") {
													$$("createScrub_repeatDay").hide()
													$$("createScrub_dayOfWeek").hide()
													$$("createScrub_monthOfYear").show()
													$$("createScrub_dayOfMonth").show()
													$$("createScrub_time").show()
												}
											}
										}
									},
									{
										id: "createScrub_repeatDay",
										cols: [
											{
												view: "text", label: "Every:", labelWidth: labelWidth, width: labelWidth + 70, id: "createScrub_day", on: {
													onKeyPress: function (code, e) {
														return isKeyValidNumber(code, e)
													}
												}
											},
											{
												view: "label", label: "day(s)"
											}
										]
									},
									{
										id: "createScrub_dayOfWeek", hidden: true,
										cols: [
											{
												rows: [
													{
														view: "label", label: "On day:", width: labelWidth,
													},
													{}
												]
											},
											{
												rows: [
													{
														id: "createScrub_dayOfWeek_container1",
														cols: [
															{
																view: "checkbox", id: "createScrub_mon", labelRight: "Mon", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_tue", labelRight: "Tue", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_wed", labelRight: "Wed", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_thu", labelRight: "Thu", labelWidth: 0,
															},
														]
													},
													{
														id: "createScrub_dayOfWeek_container2",
														cols: [
															{
																view: "checkbox", id: "createScrub_fri", labelRight: "Fri", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_sat", labelRight: "Sat", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_sun", labelRight: "Sun", labelWidth: 0,
															},
															{}
														]
													}
												]
											}
										]
									},
									{
										id: "createScrub_monthOfYear", hidden: true,
										cols: [
											{
												rows: [
													{
														view: "label", label: "In month:", width: labelWidth,
													},
													{}
												]
											},
											{
												rows: [
													{
														id: "createScrub_monthOfYear_container1",
														cols: [
															{
																view: "checkbox", id: "createScrub_jan", labelRight: "Jan", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_feb", labelRight: "Feb", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_mar", labelRight: "Mar", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_apr", labelRight: "Apr", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_may", labelRight: "May", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_jun", labelRight: "Jun", labelWidth: 0,
															},
														]
													},
													{
														id: "createScrub_monthOfYear_container2",
														cols: [
															{
																view: "checkbox", id: "createScrub_jul", labelRight: "Jul", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_aug", labelRight: "Aug", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_sep", labelRight: "Sep", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_oct", labelRight: "Oct", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_nov", labelRight: "Nov", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_dec", labelRight: "Dec", labelWidth: 0,
															}
														]
													}
												]
											}
										]
									},
									{
										id: "createScrub_dayOfMonth", hidden: true,
										cols: [
											{
												rows: [
													{
														view: "label", label: "Day of month:", width: labelWidth,
													},
													{}
												]
											},
											{
												rows: [
													{
														id: "createScrub_dayOfMonth_container1",
														cols: [
															{
																view: "checkbox", id: "createScrub_first", labelRight: "1", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_second", labelRight: "2", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_third", labelRight: "3", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_fourth", labelRight: "4", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_fifth", labelRight: "5", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_sixth", labelRight: "6", labelWidth: 0,
															},
															{}
														]
													},
													{
														id: "createScrub_dayOfMonth_container2",
														cols: [
															{
																view: "checkbox", id: "createScrub_seventh", labelRight: "7", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_eighth", labelRight: "8", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_ninth", labelRight: "9", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_tenth", labelRight: "10", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_eleventh", labelRight: "11", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_twelfth", labelRight: "12", labelWidth: 0,
															},
															{}
														]
													},
													{
														id: "createScrub_dayOfMonth_container3",
														cols: [
															{
																view: "checkbox", id: "createScrub_thirteenth", labelRight: "13", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_fourteenth", labelRight: "14", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_fifteenth", labelRight: "15", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_sixteenth", labelRight: "16", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_seventeenth", labelRight: "17", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_eighteenth", labelRight: "18", labelWidth: 0,
															},
															{}
														]
													},
													{
														id: "createScrub_dayOfMonth_container4",
														cols: [
															{
																view: "checkbox", id: "createScrub_nineteenth", labelRight: "19", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_twentieth", labelRight: "20", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_twentyfirst", labelRight: "21", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_twentysecond", labelRight: "22", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_twentythird", labelRight: "23", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_twentyfourth", labelRight: "24", labelWidth: 0,
															},
															{}
														]
													},
													{
														id: "createScrub_dayOfMonth_container5",
														cols: [
															{
																view: "checkbox", id: "createScrub_twentyfifth", labelRight: "25", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_twentysixth", labelRight: "26", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_twentyseventh", labelRight: "27", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_twentyeighth", labelRight: "28", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_twentyninth", labelRight: "29", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_thirtieth", labelRight: "30", labelWidth: 0,
															},
															{
																view: "checkbox", id: "createScrub_thirtyfirst", labelRight: "31", labelWidth: 0,
															}
														]
													}
												]
											}
										]
									},
									{
										id: "createScrub_time",
										cols: [
											{
												view: "richselect", label: "At:", labelWidth: labelWidth, width: labelWidth + 70, value: "1", id: "createScrub_hour", options: [
													{ id: "1", value: "00" },
													{ id: "2", value: "01" },
													{ id: "3", value: "02" },
													{ id: "4", value: "03" },
													{ id: "5", value: "04" },
													{ id: "6", value: "05" },
													{ id: "7", value: "06" },
													{ id: "8", value: "07" },
													{ id: "9", value: "08" },
													{ id: "10", value: "09" },
													{ id: "11", value: "10" },
													{ id: "12", value: "11" },
													{ id: "13", value: "12" },
													{ id: "14", value: "13" },
													{ id: "15", value: "14" },
													{ id: "16", value: "15" },
													{ id: "17", value: "16" },
													{ id: "18", value: "17" },
													{ id: "19", value: "18" },
													{ id: "20", value: "19" },
													{ id: "21", value: "20" },
													{ id: "22", value: "21" },
													{ id: "23", value: "22" },
													{ id: "24", value: "23" },
												]
											},
											{
												view: "label", label: ":", width: 8
											},
											{
												view: "richselect", id: "createScrub_minute", width: 70, value: "1", options: [
													{ id: "1", value: "00" },
													{ id: "2", value: "05" },
													{ id: "3", value: "10" },
													{ id: "4", value: "15" },
													{ id: "5", value: "20" },
													{ id: "6", value: "25" },
													{ id: "7", value: "30" },
													{ id: "8", value: "35" },
													{ id: "9", value: "40" },
													{ id: "10", value: "45" },
													{ id: "11", value: "50" },
													{ id: "12", value: "55" },
												]
											}
										]
									},
									{},
									{
										cols: [
											{
												view: "button", value: "Apply", css: "new_style_primary", width: 70, click: () => {
													// validate form
													var patternValue = $$("createScrub_repeatPattern").getValue()
													var cronString = ""
													if (patternValue == "2") {
														if ($$("createScrub_day").getValue() == "") {
															webix.message({
																type: "error",
																text: "Please write a number of days",
																expire: 5000
															})
															return
														}
														var minute = $$("createScrub_minute").getText()[0] === "0" ? $$("createScrub_minute").getText()[1] : $$("createScrub_minute").getText()
														var hour = $$("createScrub_hour").getText()[0] === "0" ? $$("createScrub_hour").getText()[1] : $$("createScrub_hour").getText()
														cronString = minute + " " + hour + " */" + $$("createScrub_day").getValue() + " * *"
													} else if (patternValue == "3") {
														var days = []
														if ($$("createScrub_mon").getValue() == 1) {
															days.push("1")
														}
														if ($$("createScrub_tue").getValue() == 1) {
															days.push("2")
														}
														if ($$("createScrub_wed").getValue() == 1) {
															days.push("3")
														}
														if ($$("createScrub_thu").getValue() == 1) {
															days.push("4")
														}
														if ($$("createScrub_fri").getValue() == 1) {
															days.push("5")
														}
														if ($$("createScrub_sat").getValue() == 1) {
															days.push("6")
														}
														if ($$("createScrub_sun").getValue() == 1) {
															days.push("0")
														}

														if (days.length == 0) {
															webix.message({
																text: "Please select at least one day",
																type: "error",
																expire: 5000,
															})
															return
														}

														var minute = $$("createScrub_minute").getText()[0] === "0" ? $$("createScrub_minute").getText()[1] : $$("createScrub_minute").getText()
														var hour = $$("createScrub_hour").getText()[0] === "0" ? $$("createScrub_hour").getText()[1] : $$("createScrub_hour").getText()
														cronString = minute + " " + hour + " * * " + days.join(",")
													} else if (patternValue == "4" || patternValue == "5") {
														var days = []
														if ($$("createScrub_first").getValue() == 1) {
															days.push("1")
														}
														if ($$("createScrub_second").getValue() == 1) {
															days.push("2")
														}
														if ($$("createScrub_third").getValue() == 1) {
															days.push("3")
														}
														if ($$("createScrub_fourth").getValue() == 1) {
															days.push("4")
														}
														if ($$("createScrub_fifth").getValue() == 1) {
															days.push("5")
														}
														if ($$("createScrub_sixth").getValue() == 1) {
															days.push("6")
														}
														if ($$("createScrub_seventh").getValue() == 1) {
															days.push("7")
														}
														if ($$("createScrub_eighth").getValue() == 1) {
															days.push("8")
														}
														if ($$("createScrub_ninth").getValue() == 1) {
															days.push("9")
														}
														if ($$("createScrub_tenth").getValue() == 1) {
															days.push("10")
														}
														if ($$("createScrub_eleventh").getValue() == 1) {
															days.push("11")
														}
														if ($$("createScrub_twelfth").getValue() == 1) {
															days.push("12")
														}
														if ($$("createScrub_thirteenth").getValue() == 1) {
															days.push("13")
														}
														if ($$("createScrub_fourteenth").getValue() == 1) {
															days.push("14")
														}
														if ($$("createScrub_fifteenth").getValue() == 1) {
															days.push("15")
														}
														if ($$("createScrub_sixteenth").getValue() == 1) {
															days.push("16")
														}
														if ($$("createScrub_seventeenth").getValue() == 1) {
															days.push("17")
														}
														if ($$("createScrub_eighteenth").getValue() == 1) {
															days.push("18")
														}
														if ($$("createScrub_nineteenth").getValue() == 1) {
															days.push("19")
														}
														if ($$("createScrub_twentieth").getValue() == 1) {
															days.push("20")
														}
														if ($$("createScrub_twentyfirst").getValue() == 1) {
															days.push("21")
														}
														if ($$("createScrub_twentysecond").getValue() == 1) {
															days.push("22")
														}
														if ($$("createScrub_twentythird").getValue() == 1) {
															days.push("23")
														}
														if ($$("createScrub_twentyfourth").getValue() == 1) {
															days.push("24")
														}
														if ($$("createScrub_twentyfifth").getValue() == 1) {
															days.push("25")
														}
														if ($$("createScrub_twentysixth").getValue() == 1) {
															days.push("26")
														}
														if ($$("createScrub_twentyseventh").getValue() == 1) {
															days.push("27")
														}
														if ($$("createScrub_twentyeighth").getValue() == 1) {
															days.push("28")
														}
														if ($$("createScrub_twentyninth").getValue() == 1) {
															days.push("29")
														}
														if ($$("createScrub_thirtieth").getValue() == 1) {
															days.push("30")
														}
														if ($$("createScrub_thirtyfirst").getValue() == 1) {
															days.push("31")
														}

														if (days.length == 0) {
															webix.message({
																text: "Please select at least one day",
																type: "error",
																expire: 5000,
															})
															return
														}

														if (patternValue == "4") {
															var minute = $$("createScrub_minute").getText()[0] === "0" ? $$("createScrub_minute").getText()[1] : $$("createScrub_minute").getText()
															var hour = $$("createScrub_hour").getText()[0] === "0" ? $$("createScrub_hour").getText()[1] : $$("createScrub_hour").getText()
															cronString = minute + " " + hour + " " + days.join(",") + " * *"
														} else if (patternValue == "5") {
															var months = []
															if ($$("createScrub_jan").getValue() == 1) {
																months.push("1")
															}
															if ($$("createScrub_feb").getValue() == 1) {
																months.push("2")
															}
															if ($$("createScrub_mar").getValue() == 1) {
																months.push("3")
															}
															if ($$("createScrub_apr").getValue() == 1) {
																months.push("4")
															}
															if ($$("createScrub_may").getValue() == 1) {
																months.push("5")
															}
															if ($$("createScrub_jun").getValue() == 1) {
																months.push("6")
															}
															if ($$("createScrub_jul").getValue() == 1) {
																months.push("7")
															}
															if ($$("createScrub_aug").getValue() == 1) {
																months.push("8")
															}
															if ($$("createScrub_sep").getValue() == 1) {
																months.push("9")
															}
															if ($$("createScrub_oct").getValue() == 1) {
																months.push("10")
															}
															if ($$("createScrub_nov").getValue() == 1) {
																months.push("11")
															}
															if ($$("createScrub_dec").getValue() == 1) {
																months.push("12")
															}

															if (months.length == 0) {
																webix.message({
																	text: "Please select at least one month",
																	type: "error",
																	expire: 5000,
																})
																return
															}

															var minute = $$("createScrub_minute").getText()[0] === "0" ? $$("createScrub_minute").getText()[1] : $$("createScrub_minute").getText()
															var hour = $$("createScrub_hour").getText()[0] === "0" ? $$("createScrub_hour").getText()[1] : $$("createScrub_hour").getText()
															cronString = minute + " " + hour + " " + days.join(",") + " " + months.join(",") + " *"
														}
													}

													var repeatType = $$("createScrub_repeatPattern").getValue()
													if (repeatType === "1") {
														repeatType = "DISABLE"
													} else if (repeatType === "2") {
														repeatType = "DAILY"
													} else if (repeatType === "3") {
														repeatType = "WEEKLY"
													} else if (repeatType === "4") {
														repeatType = "MONTHLY"
													} else if (repeatType === "5") {
														repeatType = "YEARLY"
													}

													var json = {
														"repeat_type": repeatType,
														"crontab_string": cronString,
													}

													$$("create_scrub_window").disable()
													$$("create_scrub_window").showProgress({
														type: "icon",
														hide: false,
													})

													webix.ajax().post("/api/storage/pools/" + poolRefId + "/scrub", JSON.stringify(json)).then((response) => {
														var data = response.json()
														webix.message({ type: "default", text: data, expire: 10000 })

														// $$("poolManagementTabDatasetsDatatable").clearAll()
														// $$("poolManagementTabDatasetsDatatable").load("/api/storage/pools/" + poolRefId + "/filesystems")
														$$("create_scrub_window").enable()
														$$("create_scrub_window").hideProgress()
														this.hideWindow()
													}).fail((xhr) => {
														ajaxFail(xhr)
													})
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
			},
			on: {
				onShow: () => {
					poolRefId = this.getParam("pool_id", true)

					webix.ajax().get("/api/storage/pools/" + poolRefId + "/scrub-scheduler").then((response) => {
						var scheduler = response.json()
						if (!scheduler.repeatType) {
							return
						}

						var crontabString = scheduler.crontabString

						if (scheduler.repeatType == "DISABLE") {
							$$("createScrub_repeatPattern").setValue("1")
						} else if (scheduler.repeatType == "DAILY") {
							$$("createScrub_repeatPattern").setValue("2")
							var split = crontabString.split(" ")
							var minute = split[0] / 5 + 1
							var hour = split[1] / 1 + 1
							var day = split[2].split("/")[1]
							$$("createScrub_minute").setValue(minute + "")
							$$("createScrub_hour").setValue(hour + "")
							$$("createScrub_day").setValue(day)
						} else if (scheduler.repeatType == "WEEKLY") {
							$$("createScrub_repeatPattern").setValue("3")
							var split = crontabString.split(" ")
							var minute = split[0] / 5 + 1
							var hour = split[1] / 1 + 1
							$$("createScrub_minute").setValue(minute + "")
							$$("createScrub_hour").setValue(hour + "")
							var days = split[4].split(",")
							for (var i = 0; i < days.length; i++) {
								if (days[i] == "1") {
									$$("createScrub_mon").setValue(1)
								} else if (days[i] == "2") {
									$$("createScrub_tue").setValue(1)
								} else if (days[i] == "3") {
									$$("createScrub_wed").setValue(1)
								} else if (days[i] == "4") {
									$$("createScrub_thu").setValue(1)
								} else if (days[i] == "5") {
									$$("createScrub_fri").setValue(1)
								} else if (days[i] == "6") {
									$$("createScrub_sat").setValue(1)
								} else if (days[i] == "0") {
									$$("createScrub_sun").setValue(1)
								}
							}
						} else if (scheduler.repeatType == "MONTHLY" || scheduler.repeatType == "YEARLY") {
							var split = crontabString.split(" ")
							var minute = split[0] / 5 + 1
							var hour = split[1] / 1 + 1
							$$("createScrub_minute").setValue(minute + "")
							$$("createScrub_hour").setValue(hour + "")
							var days = split[2].split(",")
							for (var i = 0; i < days.length; i++) {
								if (days[i] == "1") {
									$$("createScrub_first").setValue(1)
								} else if (days[i] == "2") {
									$$("createScrub_second").setValue(1)
								} else if (days[i] == "3") {
									$$("createScrub_third").setValue(1)
								} else if (days[i] == "4") {
									$$("createScrub_fourth").setValue(1)
								} else if (days[i] == "5") {
									$$("createScrub_fifth").setValue(1)
								} else if (days[i] == "6") {
									$$("createScrub_sixth").setValue(1)
								} else if (days[i] == "7") {
									$$("createScrub_seventh").setValue(1)
								} else if (days[i] == "8") {
									$$("createScrub_eighth").setValue(1)
								} else if (days[i] == "9") {
									$$("createScrub_nineth").setValue(1)
								} else if (days[i] == "10") {
									$$("createScrub_tenth").setValue(1)
								} else if (days[i] == "11") {
									$$("createScrub_eleventh").setValue(1)
								} else if (days[i] == "12") {
									$$("createScrub_twelfth").setValue(1)
								} else if (days[i] == "13") {
									$$("createScrub_thirteenth").setValue(1)
								} else if (days[i] == "14") {
									$$("createScrub_fourteenth").setValue(1)
								} else if (days[i] == "15") {
									$$("createScrub_fifteenth").setValue(1)
								} else if (days[i] == "16") {
									$$("createScrub_sixteenth").setValue(1)
								} else if (days[i] == "17") {
									$$("createScrub_seventeenth").setValue(1)
								} else if (days[i] == "18") {
									$$("createScrub_eighteenth").setValue(1)
								} else if (days[i] == "19") {
									$$("createScrub_nineteenth").setValue(1)
								} else if (days[i] == "20") {
									$$("createScrub_twentieth").setValue(1)
								} else if (days[i] == "21") {
									$$("createScrub_twentyfirst").setValue(1)
								} else if (days[i] == "22") {
									$$("createScrub_twentysecond").setValue(1)
								} else if (days[i] == "23") {
									$$("createScrub_twentythird").setValue(1)
								} else if (days[i] == "24") {
									$$("createScrub_twentyfourth").setValue(1)
								} else if (days[i] == "25") {
									$$("createScrub_twentyfifth").setValue(1)
								} else if (days[i] == "26") {
									$$("createScrub_twentysixth").setValue(1)
								} else if (days[i] == "27") {
									$$("createScrub_twentyseventh").setValue(1)
								} else if (days[i] == "28") {
									$$("createScrub_twentyeighth").setValue(1)
								} else if (days[i] == "29") {
									$$("createScrub_twentyninth").setValue(1)
								} else if (days[i] == "30") {
									$$("createScrub_thirtieth").setValue(1)
								} else if (days[i] == "31") {
									$$("createScrub_thirtyfirst").setValue(1)
								}

								if (scheduler.repeatType == "MONTHLY") {
									$$("createScrub_repeatPattern").setValue("4")
								} else if (scheduler.repeatType == "YEARLY") {
									$$("createScrub_repeatPattern").setValue("5")
									var months = split[3].split(",")
									for (var i = 0; i < months.length; i++) {
										if (months[i] == "1") {
											$$("createScrub_jan").setValue(1)
										} else if (months[i] == "2") {
											$$("createScrub_feb").setValue(1)
										} else if (months[i] == "3") {
											$$("createScrub_mar").setValue(1)
										} else if (months[i] == "4") {
											$$("createScrub_apr").setValue(1)
										} else if (months[i] == "5") {
											$$("createScrub_may").setValue(1)
										} else if (months[i] == "6") {
											$$("createScrub_jun").setValue(1)
										} else if (months[i] == "7") {
											$$("createScrub_jul").setValue(1)
										} else if (months[i] == "8") {
											$$("createScrub_aug").setValue(1)
										} else if (months[i] == "9") {
											$$("createScrub_sep").setValue(1)
										} else if (months[i] == "10") {
											$$("createScrub_oct").setValue(1)
										} else if (months[i] == "11") {
											$$("createScrub_nov").setValue(1)
										} else if (months[i] == "12") {
											$$("createScrub_dec").setValue(1)
										}
									}
								}
							}
						}
					})
				},
				onHide: () => {
					$$("createScrub_repeatPattern").setValue("2")
					$$("createScrub_day").setValue("")

					var createScrub_dayOfWeek_container1 = $$("createScrub_dayOfWeek_container1")
					var createScrub_dayOfWeek_container2 = $$("createScrub_dayOfWeek_container2")
					// get all children of container1 and container2
					var dayOfWeek_children1 = createScrub_dayOfWeek_container1.getChildViews()
					var dayOfWeek_children2 = createScrub_dayOfWeek_container2.getChildViews()
					// uncheck all checkboxes
					for (var i = 0; i < dayOfWeek_children1.length; i++) {
						// if a view is a checkbox, uncheck it
						if (dayOfWeek_children1[i].config.view == "checkbox") {
							dayOfWeek_children1[i].setValue(0)
						}
					}
					for (var i = 0; i < dayOfWeek_children2.length; i++) {
						// if a view is a checkbox, uncheck it
						if (dayOfWeek_children2[i].config.view == "checkbox") {
							dayOfWeek_children2[i].setValue(0)
						}
					}

					var createScrub_monthOfYear_container1 = $$("createScrub_monthOfYear_container1")
					var createScrub_monthOfYear_container2 = $$("createScrub_monthOfYear_container2")
					// get all children of container1 and container2
					var monthOfYear_children1 = createScrub_monthOfYear_container1.getChildViews()
					var monthOfYear_children2 = createScrub_monthOfYear_container2.getChildViews()
					// uncheck all checkboxes
					for (var i = 0; i < monthOfYear_children1.length; i++) {
						// if a view is a checkbox, uncheck it
						if (monthOfYear_children1[i].config.view == "checkbox") {
							monthOfYear_children1[i].setValue(0)
						}
					}
					for (var i = 0; i < monthOfYear_children2.length; i++) {

						// if a view is a checkbox, uncheck it
						if (monthOfYear_children2[i].config.view == "checkbox") {
							monthOfYear_children2[i].setValue(0)
						}
					}

					var createScrub_dayOfMonth_container1 = $$("createScrub_dayOfMonth_container1")
					var createScrub_dayOfMonth_container2 = $$("createScrub_dayOfMonth_container2")
					var createScrub_dayOfMonth_container3 = $$("createScrub_dayOfMonth_container3")
					var createScrub_dayOfMonth_container4 = $$("createScrub_dayOfMonth_container4")
					var createScrub_dayOfMonth_container5 = $$("createScrub_dayOfMonth_container5")
					// get all children of container1~5
					var dayOfMonth_children1 = createScrub_dayOfMonth_container1.getChildViews()
					var dayOfMonth_children2 = createScrub_dayOfMonth_container2.getChildViews()
					var dayOfMonth_children3 = createScrub_dayOfMonth_container3.getChildViews()
					var dayOfMonth_children4 = createScrub_dayOfMonth_container4.getChildViews()
					var dayOfMonth_children5 = createScrub_dayOfMonth_container5.getChildViews()
					// uncheck all checkboxes
					for (var i = 0; i < dayOfMonth_children1.length; i++) {
						if (dayOfMonth_children1[i].config.view == "checkbox") {
							dayOfMonth_children1[i].setValue(0)
						}
					}
					for (var i = 0; i < dayOfMonth_children2.length; i++) {
						if (dayOfMonth_children2[i].config.view == "checkbox") {
							dayOfMonth_children2[i].setValue(0)
						}
					}
					for (var i = 0; i < dayOfMonth_children3.length; i++) {
						if (dayOfMonth_children3[i].config.view == "checkbox") {
							dayOfMonth_children3[i].setValue(0)
						}
					}
					for (var i = 0; i < dayOfMonth_children4.length; i++) {
						if (dayOfMonth_children4[i].config.view == "checkbox") {
							dayOfMonth_children4[i].setValue(0)
						}
					}
					for (var i = 0; i < dayOfMonth_children5.length; i++) {
						if (dayOfMonth_children5[i].config.view == "checkbox") {
							dayOfMonth_children5[i].setValue(0)
						}
					}

					$$("createScrub_minute").setValue("1")
					$$("createScrub_hour").setValue("1")

					$$("create_scrub_form").clear()
					$$("create_scrub_form").clearValidation()
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
		webix.extend($$("create_scrub_window"), webix.ProgressBar)
	}
	ready() {
		var createScrubWindow = $$("create_scrub_window")

		webix.UIManager.addHotKey("esc", function () {
			if (createScrubWindow.isVisible())
				createScrubWindow.hide()
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
		const createScrubForm = $$("create_scrub_form")

		if (createScrubForm) {
			const topBar = 48
			const labelToolbar = 35
			var html = document.documentElement;

			var height = html.offsetHeight


			createScrubForm.config.height = height - (topBar + labelToolbar)
			createScrubForm.resize()
		}
	}
}