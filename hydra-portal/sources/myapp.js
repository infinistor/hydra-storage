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
import "./styles/app.css";
import { JetApp, HashRouter } from "webix-jet";

export default class MyApp extends JetApp {
	constructor(config) {
		let theme = "";
		try {
			theme = webix.storage.local.get("theme_qadashboard");
		}
		catch (err) {
			webix.message("You blocked cookies. The theme won't be restored after page reloads.", "debug");
		}
		const defaults = {
			id: APPNAME,
			version: VERSION,
			router: HashRouter,
			debug: !PRODUCTION,
			start: "/login",
		};

		super({ ...defaults, ...config });

		this.attachEvent("app:error:resolve", function (err, url) {
			webix.delay(() => this.show("/login"));
		});
	}
}

if (!BUILD_AS_MODULE) {
	webix.ready(() => {
		if (!webix.env.touch && webix.env.scrollSize && webix.CustomScroll)
			webix.CustomScroll.init();
		new MyApp().render();
	});
}

//track js errors
if (PRODUCTION) {
	window.Raven
		.config(
			"https://59d0634de9704b61ba83823ec3bf4787@sentry.webix.io/12"
		)
		.install();
}
