"use strict";
import {RESTService} from "../RESTService";

export {};


import {XMPPUTils} from "../../common/XMPPUtils";

const GenericHandler = require("./genericHandler");
import {Conversation} from "../../common/models/Conversation";
import {Channel} from "../../common/models/Channel";

const util = require('util');

const xml = require("@xmpp/xml");

const LOG_ID = "XMPP/HNDL/CHNL - ";

const TYPE_CHAT = "chat";
const TYPE_GROUPCHAT = "groupchat";

class ChannelEventHandler extends GenericHandler {
    public MESSAGE_CHAT: any;
    public MESSAGE_GROUPCHAT: any;
    public MESSAGE_WEBRTC: any;
    public MESSAGE_MANAGEMENT: any;
    public MESSAGE_ERROR: any;
    public MESSAGE_HEADLINE: any;
    public MESSAGE_CLOSE: any;
    public channelsService: any;
    public eventEmitter: any;
    public onManagementMessageReceived: any;
    public onChannelManagementMessageReceived: any;
    public onHeadlineMessageReceived: any;
    public onReceiptMessageReceived: any;
    public onErrorMessageReceived: any;
    public findAttrs: any;
    public findChildren: any;

    constructor(xmppService, channelsService) {
        super(xmppService);

        this.MESSAGE_CHAT = "jabber:client.message.chat";
        this.MESSAGE_GROUPCHAT = "jabber:client.message.groupchat";
        this.MESSAGE_WEBRTC = "jabber:client.message.webrtc";
        this.MESSAGE_MANAGEMENT = "jabber:client.message.management";
        this.MESSAGE_ERROR = "jabber:client.message.error";
        this.MESSAGE_HEADLINE = "jabber:client.message.headline";
        this.MESSAGE_CLOSE = "jabber:client.message.headline";

        this.channelsService = channelsService;

        let that = this;

        this.onManagementMessageReceived = (msg, stanza) => {
            try {
                that.logger.log("debug", LOG_ID + "(onManagementMessageReceived) _entering_");
                that.logger.log("internal", LOG_ID + "(onManagementMessageReceived) _entering_", msg, stanza);
                let children = stanza.children;
                children.forEach(function (node) {
                    switch (node.getName()) {
                        case "room":
                            break;
                        case "usersettings":
                            break;
                        case "userinvite":
                            break;
                        case "group":
                            break;
                        case "conversation":
                            break;
                        case "mute":
                            break;
                        case "unmute":
                            break;
                        case "file":
                            break;
                        case "thumbnail":
                            break;
                        case "channel":
                            that.onChannelManagementMessageReceived(node);
                            break;
                        default:
                            that.logger.log("error", LOG_ID + "(onManagementMessageReceived) unmanaged management message node " + node.getName());
                            break;
                    }
                });
            } catch (err) {
                that.logger.log("error", LOG_ID + "(onManagementMessageReceived) CATCH Error !!! : ", err);
            }
        };

        this.onHeadlineMessageReceived = (msg, stanza) => {
            try {
                that.logger.log("debug", LOG_ID + "(onHeadlineMessageReceived) _entering_");
                that.logger.log("internal", LOG_ID + "(onHeadlineMessageReceived) _entering_", msg, stanza);
                that.logger.log("info", LOG_ID + "(onHeadlineMessageReceived) channel message received");

                that.logger.log("info", LOG_ID + "(onHeadlineMessageReceived) channel message received");

                let eventNode = stanza.children[0];
                if (!eventNode) {
                    that.logger.log("error", LOG_ID + "(onHeadlineMessageReceived) ERROR in onHeadlineMessageReceived eventNode is empty");
                    that.logger.log("internal", LOG_ID + ", stanza: " + stanza);
                    that.logger.log("internal", LOG_ID + util.inspect(stanza));
                    return;
                }
                let items = eventNode.children[0];
                if (!items) {
                    that.logger.log("error", LOG_ID + "(onHeadlineMessageReceived) ERROR in onHeadlineMessageReceived items is empty");
                    that.logger.log("internal", LOG_ID + util.inspect(eventNode));
                    that.logger.log("internal", LOG_ID + ", stanza: " + stanza);
                    return;
                }
                let item = items.children[0];
                if (!item) {
                    that.logger.log("error", LOG_ID + "(onHeadlineMessageReceived) ERROR in onHeadlineMessageReceived item is empty");
                    that.logger.log("internal", LOG_ID + util.inspect(items));
                    that.logger.log("internal", LOG_ID + ", stanza: " + stanza);
                    return;
                }
                let entry = item.children[0];
                if (!entry) {
                    that.logger.log("debug", LOG_ID + "(onHeadlineMessageReceived) onHeadlineMessageReceived entry is empty");
                    that.logger.log("internal", LOG_ID + util.inspect(item));
                    that.logger.log("internal", LOG_ID + ", stanza: " + stanza);
                    //return;
                }

                switch (item.name) {
                    case "retract": {
                        let messageId = item.attrs ? item.attrs.id || null : null;
                        if (messageId === null) {
                            that.logger.log("error", LOG_ID + "(onHeadlineMessageReceived) channel retract received, but id is empty. So ignored.");
                        } else {
                            let message = { messageId: null};
                            message.messageId = item.attrs.id;
                            that.logger.log("debug", LOG_ID + "(onHeadlineMessageReceived) channel retract received, for messageId " + message.messageId);
                            that.eventEmitter.emit("rainbow_onchannelmessagedeletedreceived", message);
                        }
                    }
                        break;
                    case "item": {
                        if (entry) {

                            let message = {
                                "messageId": item.attrs.id,
                                "channelId": entry.attrs.channelId,
                                "fromJid": entry.attrs.from,
                                "message": entry.getChild("message") ? entry.getChild("message").getText() || "" : "",
                                "title": entry.getChild("title") ? entry.getChild("title").getText() || "" : "",
                                "url": entry.getChild("url") ? entry.getChild("url").getText() || "" : "",
                                "date": new Date(entry.attrs.timestamp),
                                "images": new Array()
                            };
                            let images = entry.getChildren("images");
                            if (Array.isArray(images)) {
                                images.forEach((image) => {
                                    //that.logger.log("info", LOG_ID + "(handleXMPPConnection) channel entry images.", image);
                                    let id = image.getChild("id") ? image.getChild("id").getText() || null : null;
                                    if (id === null) {
                                        that.logger.log("error", LOG_ID + "(onHeadlineMessageReceived) channel image entry received, but image id empty. So ignored.");
                                    } else {
                                        message.images.push(id);
                                    }
                                });
                            }

                            that.eventEmitter.emit("rainbow_channelitemreceived", message);
                        } else {
                            that.logger.log("error", LOG_ID + "(onHeadlineMessageReceived) channel entry received, but empty. It can not be parsed, so ignored.", stanza);
                        }
                    }
                        break;
                    default: {
                        that.logger.log("debug", LOG_ID + "(onHeadlineMessageReceived) channel unknown event " + item.name + " received");
                    }
                        break;

                } // */
            } catch (err) {
                that.logger.log("error", LOG_ID + "(onHeadlineMessageReceived) CATCH Error !!! : ", err);
            }
        };

        this.onChannelManagementMessageReceived = (stanza) => {
            that.logger.log("debug", LOG_ID + "(onChannelManagementMessageReceived) _entering_");
            that.logger.log("internal", LOG_ID + "(onChannelManagementMessageReceived) _entering_", stanza);

            try {
                if (stanza.attrs.xmlns === "jabber:iq:configuration") {
                    let channelElem = stanza.find("channel");
                    if (channelElem && channelElem.length > 0) {

                        // Extract channel identifier
                        let channelId = channelElem.attrs.channelid;

                        // Handle cached channel info
                        /*
                        let channel: Channel = this.getChannelFromCache(channelId);
                        if (channel) {
                            let avatarElem = channelElem.find("avatar");
                            let nameElem = channelElem.find("name");
                            let topicElem = channelElem.find("topic");
                            let categoryElem = channelElem.find("category");

                            if (avatarElem && avatarElem.length > 0) {
                                this.onAvatarChange(channelId, avatarElem);
                            }
                            if (nameElem && nameElem.length > 0) {
                                channel.name = nameElem.text();
                            }
                            if (topicElem && topicElem.length > 0) {
                                channel.topic = topicElem.text();
                            }
                            if (categoryElem && categoryElem.length > 0) {
                                channel.category = categoryElem.text();
                            }
                        }
                        // */

                        // Handle channel action events
                        let action = channelElem.attrs.action;
                        that.logger.log("debug", LOG_ID + "(onChannelManagementMessageReceived) - action : " + action + " event received on channel " + channelId);
                        switch (action) {
                            case 'add':
                                that.eventEmitter.emit("rainbow_addtochannel", {'id': channelId});
                                // this.onAddToChannel(channelId);
                                break;
                            case 'update':
                                that.eventEmitter.emit("rainbow_updatetochannel", {'id': channelId});
                                //this.onUpdateToChannel(channelId);
                                break;
                            case 'remove':
                                that.eventEmitter.emit("rainbow_removefromchannel", {'id': channelId});
                                //this.onRemovedFromChannel(channelId);
                                break;
                            case 'subscribe':
                                that.eventEmitter.emit("rainbow_subscribetochannel", {'id': channelId, 'subscribers' : channelElem.attrs.subscribers});
                                //this.onSubscribeToChannel(channelId, channelElem.attrs.subscribers);
                                break;
                            case 'unsubscribe':
                                that.eventEmitter.emit("rainbow_unsubscribetochannel", {'id': channelId, 'subscribers' : channelElem.attrs.subscribers});
                                //this.onUnsubscribeToChannel(channelId, channelElem.attrs.subscribers);
                                break;
                            case 'delete':
                                //this.onDeleteChannel(channelId);
                                that.eventEmitter.emit("rainbow_deletechannel", {'id': channelId});
                                break;
                            default:
                                break;
                        }
                    }

                    let channelSubscriptionElem = stanza.find("channel-subscription");
                    if (channelSubscriptionElem && channelSubscriptionElem.length > 0) {
                        // Extract information
                        let channelId = channelSubscriptionElem.attrs.channelid;
                        let action = channelSubscriptionElem.attrs.action;
                        let userId = channelSubscriptionElem.attrs.id;
                        let subscribers = channelSubscriptionElem.attrs.subscribers;
                        that.logger.log("debug", LOG_ID + "(onChannelManagementMessageReceived) - subscription-" + action + " event received on channel " + channelId);
                        switch (action) {
                            case 'subscribe':
                                that.eventEmitter.emit("rainbow_usersubscribechannel", {'id': channelId, 'userId': userId, 'subscribers': Number.parseInt(subscribers)});
                                //this.onUserSubscribeEvent(channelId, userId);
                                break;
                            case 'unsubscribe':
                                that.eventEmitter.emit("rainbow_userunsubscribechannel", {'id': channelId, 'userId': userId, 'subscribers': Number.parseInt(subscribers)});
                                //this.onUserUnsubscribeEvent(channelId, userId);
                                break;
                            default:
                                break;
                        }
                    }
                }
                return true;
            }
            catch (err) {
                that.logger.log("error", LOG_ID + "(onChannelManagementMessageReceived) -- failure -- " + err.message);
                return true;
            }

            /*
            try {
                that.logger.log("debug", LOG_ID + "(onChannelManagementMessageReceived) _entering_");
                that.logger.log("internal", LOG_ID + "(onChannelManagementMessageReceived) _entering_", stanza);
                if (stanza.attrs.xmlns === "jabber:iq:configuration") {

                    //that.eventEmitter.emit("rainbow_channelmanagementreceived", node);

                    switch (stanza.attrs.action) {
                        case "add": {
                            that.logger.log("debug", LOG_ID + "(onChannelManagementMessageReceived) channel created");
                            let channelid = stanza.attrs.channelid;
                            that.eventEmitter.emit("rainbow_channelcreated", {'id': channelid});
                        }
                            break;
                        case "delete": {
                            that.logger.log("debug", LOG_ID + "(onChannelManagementMessageReceived) channel deleted");
                            let channelid = stanza.attrs.channelid;
                            that.eventEmitter.emit("rainbow_channeldeleted", {'id': channelid});
                        }
                            break;
                        case "update": {
                            that.logger.log("debug", LOG_ID + "(onChannelManagementMessageReceived) channel updated");
                            let channelid = stanza.attrs.channelid;

                            //let json = XMPPUTils.getXMPPUtils().getJson(node);
                            //let json = {};
                            //json = that.findChildren(node);

                            that.eventEmitter.emit("rainbow_channelupdated", {'id': channelid}); //, 'obj' : json
                        }
                            break;

                        default: {
                            let channelid = stanza.attrs.channelid;
                            that.logger.log("info", LOG_ID + "(onChannelManagementMessageReceived) channel management event unknown : " + stanza.attrs.action + " for channel " + channelid);
                        }
                            break;
                    }
                }
            } catch (err) {
                that.logger.log("error", LOG_ID + "(onChannelManagementMessageReceived) CATCH Error !!! : ", err);
            } // */
        };


        this.onReceiptMessageReceived = (msg, stanza) => {
        };

        this.onErrorMessageReceived = (msg, stanza) => {
            try {
                that.logger.log("debug", LOG_ID + "(onErrorMessageReceived) _entering_");
                that.logger.log("error", LOG_ID + "(onErrorMessageReceived) something goes wrong...", msg, stanza);
                that.eventEmitter.emit("rainbow_onerror", msg);
            } catch (err) {
                that.logger.log("error", LOG_ID + "(onErrorMessageReceived) CATCH Error !!! : ", err);
            }
        };

        this.findAttrs = () => {

        };

        this.findChildren = (element) => {
            try {
                that.logger.log("debug", LOG_ID + "(findChildren) _entering_");
                that.logger.log("internal", LOG_ID + "(findChildren) _entering_", element);
                that.logger.log("error", LOG_ID + "(findChildren) findChildren element : ", element, " name : ", element.getName());
                let json = {};
                //let result = null;
                let children = element.children;
                if (children.length > 0) {
                    json[element.getName()] = {};
                    let childrenJson = json[element.getName()];
                    children.forEach((elemt) => {
                        // @ts-ignore
                        if (typeof elemt.children === Array) {
                            that.logger.log("error", LOG_ID + "(findChildren)  children.forEach Array : ", element, ", elemt : ", elemt);
                            childrenJson[elemt.getName()] = elemt.children[0];
                        }
                        that.logger.log("error", LOG_ID + "(findChildren)  children.forEach element : ", element, ", elemt : ", elemt);
                        childrenJson[elemt.getName()] = this.findChildren(elemt);
                    });
                    return json;
                } else {
                    that.logger.log("error", LOG_ID + "(findChildren)  No children element : ", element);
                    return element.getText();
                }
                //return result;
            } catch (err) {
                that.logger.log("error", LOG_ID + "(findChildren) CATCH Error !!! : ", err);
            }
        };


    }
}

export {ChannelEventHandler};
module.exports.ChannelEventHandler = ChannelEventHandler;
