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
let i = 0;
export function newNotification(){
	return webix.copy(notifications[i++%notifications.length]);
}
const notifications = [
	{ title:"Daisy Fitzroy added new tasks", message:"'Confirm' button styling<br>Make it look as important as it is. It's for the real stuff." },
	{ title:"Tickets report", message:"No ability to exit profile editing dialogue. It's like your are in an infinite loop." },
	{ title:"You are working too much", message:"There cannot be too much time for leisure. Believe us. Stop until it's too late." },
	{ title:"Components", message:"Can you name all the Webix components that have been used to build the demo app?" },
	{ title:"We miss you", message:"Been pretty busy lately, haven't you? That's great! But also do not forget about us." },
	{ title:"Have a nice day", message:"Dear client, if you are reading this, we wish you a merry day. May luck and success attend you." },
	{ title:"Both sides of the Force", message:"Webix 6.0+ has the new skin in light and dark versions. Click the icon in the top right corner to choose." },
	{ title:"We love you", message:"Dear client, we love you very much. If you contact us and download Webix, we will love you eternally." }
];
