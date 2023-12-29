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
import BucketLifecycleRuleWindow from "./bucketLifecycleRuleWindow";

var s3browser_credentials
var bucketLifecycleRuleWindow
export default class BucketLifecycleWindow extends JetView {
	config() {
		var bucketName = ""

		return {
			view: "window",
			id: "bucket_lifecycle_window",
			position: "center",
			move: true,
			width: 700,
			head: {
				view: "toolbar",
				cols: [
					{ width: 4 },
					{ view: "label", label: "Lifecycle Rules", css: "header_label" },
					{
						view: "icon", icon: "wxi-close",
						click: function () {
							$$("bucket_lifecycle_window").hide()
						}
					}
				]
			},
			body: {
				rows: [
					// datatable
					{
						view: "datatable",
						id: "lifecycle_rules",
						headerRowHeight: 25,
						select: "row",
						scroll: "auto",
						width: 700,
						height: 500,
						tooltip: true,
						columns: [
							{ id: "Status", header: "", template: "{common.checkbox()}", width: 30, tooltip: false },
							{
								id: "Prefix", header: "Prefix", adjust: true, format: function (value) {
									if (!value) {
										return "all files"
									} else return value
								}
							},
							{
								id: "Expiration", header: "Expiration", adjust: true, tooltip: false, format: function (value) {
									if (value > -1 && value != "") {
										return value + " days"
									} else {
										return "—"
									}
								}
							},
							{
								id: "Transitions", header: "Transitions", fillspace: true, format: function (value) {
									var sentence = ""
									for (var index = 0; index < value.length; index++) {
										sentence += value[index].StorageClass + " (" + value[index].Days + "); "
									}
									return sentence
								}
							},
							{
								id: "AbortIncompleteMultipartUpload", header: "Abort Multipart", adjust: true, tooltip: false, format: function (value) {
									if (value > -1 && value != "") {
										return value + " days"
									} else {
										return "—"
									}
								}
							},
							{
								id: "edit", header: "", width: 30, tooltip: false, css: "s3_lifecycle_button",
								template: function () {
									return `<button type="button" class="hoverButton webix_icon_button">
                                            <span class="webix_icon mdi mdi-pencil"></span>
                                        </button>`
								}
							},
							{
								id: "delete", header: "", width: 40, tooltip: false, css: "s3_lifecycle_button",
								template: function () {
									return `<button type="button" class="hoverButton webix_icon_button">
                                            <span class="webix_icon mdi mdi-trash-can"></span>
                                        </button>`
								}
							},
						],
						onClick:
						{
							hoverButton: (e, id, target) => {
								if (id.column == "edit") {
									var editLifecycle = $$("lifecycle_rules").getItem(id.row).id
									this.setParam("lifecycleRuleId", editLifecycle, false)
									bucketLifecycleRuleWindow.showWindow()
								} else if (id.column == "delete") {
									// warning message
									webix.confirm({
										title: "Delete lifecycle rule",
										text: "Are you sure you want to delete this lifecycle rule?",
										callback: function (result) {
											if (result) {
												$$("lifecycle_rules").remove(id.row)
											}
										}
									})
								}
							}
						},
						data: [],

					},
					// edit, delete etc buttons
					{
						height: 5
					},
					{
						cols: [
							{
								width: 5,
							},
							{
								view: "button", autowidth: true, css: "webix_primary", label: "Apply", click: function () {
									var json = {
										credentials: s3browser_credentials,
										bucket: bucketName,
									}

									var lifecycle_rules_datatable = $$("lifecycle_rules")

									if (!lifecycle_rules_datatable.count()) {
										webix.ajax().del("/api/s3browser/buckets/lifecycle", JSON.stringify(json)).then(function (data) {
											$$("bucket_lifecycle_window").hide()
										})
									} else {
										var rules = lifecycle_rules_datatable.serialize()
										json["rules"] = rules

										webix.ajax().post("/api/s3browser/buckets/lifecycle", JSON.stringify(json)).then(function (data) {
											$$("bucket_lifecycle_window").hide()
										})
									}

								}
							},
							// {
							//     width: 5,
							// },
							// {
							//     view: "button", autowidth: true, label: "Edit", click: () => {
							//         if($$("lifecycle_rules").getSelectedItem()) {
							//             var editLifecycle = $$("lifecycle_rules").getSelectedItem().id
							//             this.setParam("lifecycleRuleId", editLifecycle, false)
							//             bucketLifecycleRuleWindow.showWindow()
							//         }		
							//     }
							// },
							// {
							//     width: 5,
							// },
							// {
							//     view: "button", autowidth: true, css: "webix_danger", label: "Delete", click: function() {
							//         if($$("lifecycle_rules").getSelectedItem()) {
							//             $$("lifecycle_rules").remove($$("lifecycle_rules").getSelectedId())
							//         }
							//     }
							// },
							{},
							{
								view: "button", type: "icon", icon: "mdi mdi-plus", label: "Add", width: 75, css: "s3_browser", click: () => {
									this.setParam("lifecycleRuleId", "", false)
									bucketLifecycleRuleWindow.showWindow()
								}
							},
							{
								width: 5
							}
						]
					},
					{
						height: 5
					}
				]
			},
			on: {
				onBeforeShow: () => {
					$$("lifecycle_rules").clearAll()

					bucketName = this.getParam("bucketName", true)

					var json = {
						credentials: s3browser_credentials,
						bucket: bucketName
					}

					webix.ajax().put("/api/s3browser/buckets/lifecycle", JSON.stringify(json)).then(function (data) {
						var rules = data.json().Rules

						for (var index = 0; index < rules.length; index++) {
							var ruleEntry = {
								Status: 1,
								Prefix: "",
								Expiration: -1,
								Transitions: [],
								AbortIncompleteMultipartUpload: -1
							}
							// if abort incomplete multipart upload rule exists
							if (rules[index].AbortIncompleteMultipartUpload) {
								ruleEntry.AbortIncompleteMultipartUpload =
									rules[index].AbortIncompleteMultipartUpload.DaysAfterInitiation
							}

							// if expiration rule exist
							if (rules[index].Expiration) {
								ruleEntry.Expiration = rules[index].Expiration.Days
							}

							// if there is a prefix
							if (rules[index].Filter.Prefix) {
								ruleEntry.Prefix = rules[index].Filter.Prefix
							}

							// value of status ("enabled" or "disabled")
							if (rules[index].Status === "Enabled") {
								ruleEntry.Status = 1
							} else {
								ruleEntry.Status = 0
							}

							// add all transition rules to a signle sentence if any exist
							if (rules[index].Transitions) {
								for (var i = 0; i < rules[index].Transitions.length; i++) {
									ruleEntry.Transitions.push({
										StorageClass: rules[index].Transitions[i].StorageClass,
										Days: rules[index].Transitions[i].Days
									})
								}
							}

							$$("lifecycle_rules").add(ruleEntry)
						}
					})
				}
			}
		}
	}
	init() {
		// get s3browser_session from session storage
		s3browser_credentials = webix.storage.session.get("s3browser_session")

		bucketLifecycleRuleWindow = this.ui(BucketLifecycleRuleWindow)
	}
	showWindow() {
		$$("bucket_lifecycle_window").show()
	}
	hideWindow() {
		$$("bucket_lifecycle_window").hide()
	}
}