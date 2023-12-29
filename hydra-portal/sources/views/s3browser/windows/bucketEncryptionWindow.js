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
export default class BucketEncryptionWindow extends JetView {
	config() {
		var bucketName = ""

		const allowedCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-."

		return {
			view: "window",
			id: "bucket_encryption_window",
			position: "center",
			move: true,
			width: 600,
			head: {
				view: "toolbar",
				borderless: true,
				cols: [
					{ width: 4 },
					{ view: "label", label: "Default Encryption Configuration", css: "header_label" },
					{
						view: "icon", icon: "wxi-close",
						click: () => {
							this.hideWindow()
						}
					}
				]
			},
			body: {
				borderless: true,
				paddingY: 10,
				paddingX: 10,
				rows: [
					{
						borderless: true,
						view: "form",
						padding: 0,
						id: "encryption_type",
						elements: [
							{
								view: "combo", id: "encryption_combo", labelWidth: 120, label: "Encryption type", width: 520,
								// based on GetBucketEncryption
								options: [
									{ "id": 1, "value": "Default Server side encryption is not configured" },
									{ "id": 2, "value": "Server-Side Encryption with Amazon S3-Managed Keys (SSE-S3)" }
								],
							}
						]
					},
					{
						view: "button", css: "webix_primary", value: "Apply", autowidth: true, click: function () {
							var json = {
								bucket: bucketName,
								credentials: s3browser_credentials,
							}
							if ($$("encryption_combo").getValue() === "1") {
								webix.ajax().del("/api/s3browser/buckets/encryption", JSON.stringify(json))
							} else {
								webix.ajax().post("/api/s3browser/buckets/encryption-sse", JSON.stringify(json))
							}

							$$("bucket_encryption_window").hide()
						}
					},
				]
			},
			on: {
				onShow: () => {
					bucketName = this.getParam("bucketName", true)

					var json = {
						bucket: bucketName,
						credentials: s3browser_credentials,
					}

					webix.ajax().put("/api/s3browser/buckets/encryption", JSON.stringify(json)).then(function (data) {
						if (data.text() === "NoSuchEncryptionConfiguration") {
							$$("encryption_combo").setValue(1)
						} else {
							$$("encryption_combo").setValue(2)
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
		$$("bucket_encryption_window").show()
	}
	hideWindow() {
		$$("bucket_encryption_window").hide()
	}
}