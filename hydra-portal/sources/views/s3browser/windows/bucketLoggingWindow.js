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

var s3browser_credentials
export default class BucketLoggingWindow extends JetView {
	config() {
		var bucketName = ""
		var bucket_options = []
		var status

		return {
			view: "window",
			id: "bucket_logging_window",
			position: "center",
			width: 500,
			move: true,
			head: {
				view: "toolbar",
				cols: [
					{ width: 4 },
					{ view: "label", label: "Bucket Logging Settings", css: "header_label" },
					{
						view: "icon", icon: "wxi-close",
						click: () => {
							this.hideWindow()
						}
					}
				]
			},
			body: {
				padding: 10,
				view: "form",
				id: "bucket_logging_form",
				elements:
					[
						{
							view: "richselect", id: "logging_status", label: "Status", labelWidth: 100, options: [
								{ id: 1, value: "Enabled" },
								{ id: 2, value: "Disabled" }
							], on: {
								onChange: function (newv, oldv) {
									if (newv == 1) {
										$$("logging_target_bucket").show()
										$$("logging_target_folder").show()
									} else {
										$$("logging_target_bucket").hide()
										$$("logging_target_folder").hide()
									}
								}
							}
						},
						{
							view: "richselect", id: "logging_target_bucket", name: "target_bucket", labelWidth: 100, label: "Target bucket", hidden: true, value: bucketName,
							invalidMessage: "Target bucket cannot be empty", on: {
								onChange: function (newv, oldv) {
									if (newv) {
										// mark invalid
										$$("bucket_logging_form").markInvalid("target_bucket", false)
									} else {
										$$("bucket_logging_form").markInvalid("target_bucket", "Target bucket cannot be empty")
									}
								}
							}
						},
						{
							view: "text", id: "logging_target_folder", name: "target_folder", label: "Target folder", labelWidth: 100, invalidMessage: "Target folder cannot be empty",
							format: {
								parse: function (value) {
									return value
								},
								edit: function (value) {
									// delete all special characters except allowedCharacters
									value = value.replace(/[^a-zA-Z0-9-.]/g, "")
									// add slash at the end
									if (value.length > 0) {
										return value + "/"
									} else return ""
								}
							}, on: {
								onChange: function (newv, oldv) {
									if (newv) {
										// mark invalid
										$$("bucket_logging_form").markInvalid("target_folder", false)
									} else {
										$$("bucket_logging_form").markInvalid("target_folder", "Target folder cannot be empty")
									}
								}
							}
						},
						{
							cols: [
								{
									view: "button", width: 40, value: "Apply", css: "webix_primary", autowidth: true, type: "form", click: function () {
										// validate form
										if ($$("bucket_logging_form").validate()) {
											var json = {
												credentials: s3browser_credentials,
												bucket: bucketName,
											}

											if ($$("logging_status").getValue() == 1 && $$("logging_target_bucket").getValue() && $$("logging_target_folder").getValue()) {
												json["logging"] = {
													"target-bucket": $$("logging_target_bucket").getValue(),
													"target-folder": $$("logging_target_folder").getValue()
												}
											} else {
												json["logging"] = null
											}

											if (status != $$("logging_status").getValue() == 1 ? true : false) {
												webix.ajax().post("/api/s3browser/buckets/logging", JSON.stringify(json)).then(function (data) {
													$$("bucket_logging_window").hide()
												})
											} else {
												$$("bucket_logging_window").hide()
											}
										}
									}
								},
								{}
							]
						},
					],
				rules: {
					"target_folder": function (value) {
						// check if status is enabled
						if ($$("logging_status").getValue() == 1) {
							// check if value is not empty --> return true
							if (value.length > 0) {
								// check if ends with /
								if (value.endsWith("/")) {
									return true
								} else {
									return false
								}
							} else {
								return false
							}
						} else {
							return true
						}
					},
					"target_bucket": function (value) {
						// check if status is enabled
						if ($$("logging_status").getValue() == 1) {
							// check if value is not empty --> return true
							if (value.length > 0) {
								return true
							} else {
								return false
							}
						} else {
							return true
						}
					}
				}
			},
			on: {
				onBeforeShow: () => {
					bucketName = this.getParam("bucketName", true)

					var json = {
						access_key: s3browser_credentials.access_key,
						access_secret: s3browser_credentials.access_secret,
						url: s3browser_credentials.url,
					}

					// get all buckets
					webix.ajax().put("/api/s3browser/buckets", JSON.stringify(json)).then(function (data) {
						var json = data.json()
						for (var i = 0; i < json.length; i++) {
							bucket_options.push({
								id: json[i].Name,
								value: json[i].Name
							})
						}

						// define logging_target_bucket options
						$$("logging_target_bucket").define("options", bucket_options)
					})


					json = {
						credentials: s3browser_credentials,
						bucket: bucketName
					}

					webix.ajax().put("/api/s3browser/buckets/logging", JSON.stringify(json)).then(function (data) {
						status = data.json().LoggingEnabled != null ? true : false

						if (status) {
							$$("logging_status").setValue(1)

							$$("logging_target_bucket").setValue(data.json().LoggingEnabled.TargetBucket)
							$$("logging_target_folder").setValue(data.json().LoggingEnabled.TargetPrefix)

							$$("logging_target_bucket").show()
							$$("logging_target_folder").show()
						} else {
							$$("logging_status").setValue(2)

							$$("logging_target_folder").setValue("logs/")

							$$("logging_target_bucket").hide()
							$$("logging_target_folder").hide()
						}
					})
				}
			}
		}
	}
	init() {
		// get s3browser_session from session storage
		s3browser_credentials = webix.storage.session.get("s3browser_session")
	}
	showWindow() {
		$$("bucket_logging_window").show()
	}
	hideWindow() {
		$$("bucket_logging_window").hide()
	}
}