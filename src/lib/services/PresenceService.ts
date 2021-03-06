"use strict";
import {Logger} from "../common/Logger";
import {XMPPService} from "../connection/XMPPService";
import {ErrorManager} from "../common/ErrorManager";
import * as PubSub from "pubsub-js";
import {PresenceEventHandler} from "../connection/XMPPServiceHandler/presenceEventHandler";
import {isStarted, logEntryExit, until} from "../common/Utils";
import {SettingsService} from "./SettingsService";
import {EventEmitter} from "events";
import {RESTService} from "../connection/RESTService";
import {ROOMROLE, S2SService} from "./S2SService";
import {Core} from "../Core";
import {BubblesService} from "./BubblesService";
import {PresenceLevel, PresenceRainbow} from "../common/models/PresenceRainbow";

export {};

const LOG_ID = "PRES/SVCE - ";

@logEntryExit(LOG_ID)
@isStarted([])
/**
 * @module
 * @name PresenceService
 * @version SDKVERSION
 * @public
 * @description
 *      This module manages the presence of the connected user.
 *      <br><br>
 *      The main methods proposed in that module allow to: <br>
 *      - Change the connected user presence
 */
class PresenceService {
    private _logger: Logger;
    private _xmpp: XMPPService;
    private _settings: SettingsService;
    private _presenceEventHandler: PresenceEventHandler;
    private _presenceHandlerToken: any;
    private _eventEmitter: EventEmitter;
    private manualState: boolean;
    private _currentPresence: PresenceRainbow;
    public RAINBOW_PRESENCE_ONLINE: PresenceLevel.Online;
    public RAINBOW_PRESENCE_DONOTDISTURB: PresenceLevel.Dnd;
    public RAINBOW_PRESENCE_AWAY: PresenceLevel.Away;
    public RAINBOW_PRESENCE_INVISIBLE: PresenceLevel.Invisible;
    public ready: boolean = false;
    private readonly _startConfig: {
        start_up:boolean,
        optional:boolean
    };
    private _s2s: S2SService;
    private _options: any;
    private _useXMPP: any;
    private _useS2S: any;
    private _rest: RESTService;
    private _bubbles: BubblesService;

    get startConfig(): { start_up: boolean; optional: boolean } {
        return this._startConfig;
    }

    constructor(_eventEmitter, _logger, _startConfig) {
        let that = this;
        this._startConfig = _startConfig;

        this._xmpp = null;
        this._rest = null;
        that._s2s = null;
        this._options = {};
        this._useXMPP = false;
        this._useS2S = false;
        that._eventEmitter = _eventEmitter;
        that._logger = _logger;

        that.manualState = false;
        that._currentPresence = new PresenceRainbow(PresenceLevel.Online);
        that.RAINBOW_PRESENCE_ONLINE = PresenceLevel.Online;
        that.RAINBOW_PRESENCE_DONOTDISTURB = PresenceLevel.Dnd;
        that.RAINBOW_PRESENCE_AWAY = PresenceLevel.Away;
        that.RAINBOW_PRESENCE_INVISIBLE = PresenceLevel.Invisible;


        that._eventEmitter.on("evt_internal_usersettingschanged", that._onUserSettingsChanged.bind(that));
        that._eventEmitter.on("evt_internal_presencechanged", that._onPresenceChanged.bind(that));
        this.ready = false;
    }

    start(_options, _core : Core ) { // , _xmpp : XMPPService, _s2s: S2SService, _rest : RESTService, _settings : SettingsService
        let that = this;
        return new Promise(function(resolve, reject) {
            try {
                that._options = _options;
                that._xmpp = _core._xmpp;
                that._rest = _core._rest;
                that._s2s = _core._s2s;
                that._settings = _core.settings;
                that._useXMPP = that._options.useXMPP;
                that._useS2S = that._options.useS2S;
                that._bubbles = _core.bubbles;


                that._presenceEventHandler = new PresenceEventHandler(that._xmpp, _core._contacts);
                that._presenceHandlerToken = PubSub.subscribe( that._xmpp.hash + "." + that._presenceEventHandler.PRESENCE, that._presenceEventHandler.onPresenceReceived);

/*
                that._eventEmitter.removeListener("evt_internal_usersettingschanged", that._onUserSettingsChanged.bind(that));
                that._eventEmitter.removeListener("evt_internal_presencechanged", that._onPresenceChanged.bind(that));

                that._eventEmitter.on("evt_internal_usersettingschanged", that._onUserSettingsChanged.bind(that));
                that._eventEmitter.on("evt_internal_presencechanged", that._onPresenceChanged.bind(that));
*/
                that.ready = true;
                resolve();

            } catch (err) {
                that._logger.log("error", LOG_ID + "(start) Catch Error !!!");
                that._logger.log("internalerror", LOG_ID + "(start) Catch Error !!! : ", err);
                return reject();
            }
        });
    }

    stop() {
        let that = this;
        return new Promise(function(resolve, reject) {
            try {
                delete that._presenceEventHandler;
                that._presenceEventHandler = null;
                PubSub.unsubscribe(that._presenceHandlerToken);

                that._xmpp = null;
/*
                that._eventEmitter.removeListener("evt_internal_usersettingschanged", that._onUserSettingsChanged.bind(that));
                that._eventEmitter.removeListener("evt_internal_presencechanged", that._onPresenceChanged.bind(that));
*/
                that.ready = false;
                resolve();

            } catch (err) {
                return reject();
            }
        });
    }

    /**
     * @private
     * @method sendInitialPresence
     * @instance
     * @description
     *  Send the initial presence (online)
     * @return {ErrorManager.Ok} A promise containing the result
     */
    sendInitialPresence() {

        let that = this;
        return new Promise((resolve) => {
            that._eventEmitter.once("evt_internal_presencechanged", function fn_onpresencechanged(presence) {
                that._logger.log("info", LOG_ID + "(sendInitialPresence) received.");
                that._logger.log("internal", LOG_ID + "(sendInitialPresence) received : ", presence);
                that._eventEmitter.removeListener("evt_internal_presencechanged", fn_onpresencechanged);
                resolve(ErrorManager.getErrorManager().OK);
            });
            let presenceRainbow = new PresenceRainbow();
            that._logger.log("internal", LOG_ID + "(sendInitialPresence) presenceRainbow : ", presenceRainbow);
            that._xmpp.setPresence(presenceRainbow.presenceShow, presenceRainbow.presenceStatus);
            //that._xmpp.setPresence("online", "");
        });
    }

    /**
     * @public
     * @method setPresenceTo
     * @instance
     * @description
     *    Allow to change the presence of the connected user <br/>
     *    Only the following values are authorized: 'dnd', 'away', 'invisible' or 'online'
     * @param {String} presence The presence value to set i.e: 'dnd', 'away', 'invisible' ('xa' on server side) or 'online'
     * @async
     * @return {Promise<ErrorManager>}
     * @fulfil {ErrorManager} - ErrorManager object depending on the result (ErrorManager.getErrorManager().OK in case of success)
     * @category async
     */
    setPresenceTo(presence) {
        let that = this;
        let presenceRainbow = new PresenceRainbow(presence);
       // let show = "online";
        //let status = "";
        return new Promise(async (resolve, reject) => {

            /* switch (presence) {
                case "online":
                    //show = "online";
                    //status = "";
                    show = undefined;
                    status = "mode=auto";
                    break;
                case "away":
                    show = "xa";
                    status = "away";
                    break;
                case "dnd":
                    show = "dnd";
                    status = "";
                    break;
                case "invisible":
                    show = "xa";
                    status = "";
                    break;
                default:
                    that._logger.log("warn", LOG_ID + "(setPresenceTo) Bad or empty 'presence' parameter");
                    that._logger.log("internalerror", LOG_ID + "(setPresenceTo) Bad or empty 'presence' parameter : ", presence);
                    return reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    break;
            } // */

            that._eventEmitter.once("evt_internal_presencechanged", function fn_onpresencechanged(_presence) {
                that._logger.log("info", LOG_ID + "(setPresenceTo) received.");
                that._logger.log("internal", LOG_ID + "(setPresenceTo) received : ", _presence);
                that._eventEmitter.removeListener("evt_internal_presencechanged", fn_onpresencechanged);
                resolve(ErrorManager.getErrorManager().OK);
            });

            that._logger.log("internal", LOG_ID + "(setPresenceTo) that._useXMPP : ", that._useXMPP, ", that._useS2S : ", that._useS2S, ", presenceRainbow : ", presenceRainbow, ", presence : ", presence);

            if (that._useXMPP) {
                that._xmpp.setPresence(presenceRainbow.presenceShow, presenceRainbow.presenceStatus);
            }
            if (that._useS2S) {
                await that._s2s.sendS2SPresence(presenceRainbow.toJsonForServer());
            }
            await that._settings.updateUserSettings({presence: presenceRainbow.presenceLevel});
        });
    }

    /**
     * @public
     * @method getUserConnectedPresence
     * @instance
     * @description
     *      Get user presence status calculated from events.
     */
    getUserConnectedPresence() : PresenceRainbow {
        return this._currentPresence ;
    }

     /**
     * @private
     * @method _setUserPresenceStatus
     * @instance
     * @description
     *      Send user presence status and message to xmpp.
     */
    //_setUserPresenceStatus( status, message?) {
    _setUserPresenceStatus( presenceRainbow : PresenceRainbow) {
         let that = this;
         return new Promise(async (resolve, reject) => {

             if (that._useXMPP) {
                 that._eventEmitter.once("evt_internal_presencechanged", function fn_onpresencechanged(presence) {
                     that._logger.log("info", LOG_ID + "(_setUserPresenceStatus) received.");
                     that._logger.log("internal", LOG_ID + "(_setUserPresenceStatus) received : ", presence);
                     that._eventEmitter.removeListener("evt_internal_presencechanged", fn_onpresencechanged);
                     resolve();
                 });
                 await that._xmpp.setPresence(presenceRainbow.presenceShow, presenceRainbow.presenceStatus);
             }
             if (that._useS2S) {
                 let presenceChangedReceived = false;
                 that._eventEmitter.once("evt_internal_presencechanged", function fn_onpresencechanged(presence) {
                     that._logger.log("info", LOG_ID + "(_setUserPresenceStatus) received.");
                     that._logger.log("internal", LOG_ID + "(_setUserPresenceStatus) received : ", presence);
                     that._eventEmitter.removeListener("evt_internal_presencechanged", fn_onpresencechanged);
                     presenceChangedReceived = true;
                     //resolve();
                 });
                 let result = await that._s2s.sendS2SPresence(presenceRainbow.toJsonForServer());
                 that._logger.log("internal", LOG_ID + "(_setUserPresenceStatus) sendS2SPresence result : ", result);
                 until(() => { return (presenceChangedReceived === true); }, "Wait for presencechanged after set presence S2S.", 10000).then((untilResult)=>{
                     that._logger.log("internal", LOG_ID + "(_setUserPresenceStatus) evt_internal_presencechanged received, can continue : ", untilResult);
                     resolve();
                 }).catch((untilResult)=>{
                     that._logger.log("internal", LOG_ID + "(_setUserPresenceStatus) evt_internal_presencechanged NOT received, force continue : ", untilResult);
                     resolve();
                 })
             }

             /*if (that._useXMPP) {
                 if (status === "online") {
                     that.manualState = false;
                     that._eventEmitter.once("evt_internal_presencechanged", function fn_onpresencechanged(presence) {
                         that._logger.log("info", LOG_ID + "(_setUserPresenceStatus) received.");
                         that._logger.log("internal", LOG_ID + "(_setUserPresenceStatus) received : ", presence);
                         that._eventEmitter.removeListener("evt_internal_presencechanged", fn_onpresencechanged);
                         resolve();
                     });
                     that._xmpp.setPresence(null, status);
                 } else {
                     that.manualState = true;
                     if (status === "away") {
                         that._eventEmitter.once("evt_internal_presencechanged", function fn_onpresencechanged(presence) {
                             that._logger.log("info", LOG_ID + "(_setUserPresenceStatus) received.");
                             that._logger.log("internal", LOG_ID + "(_setUserPresenceStatus) received : ", presence);
                             that._eventEmitter.removeListener("evt_internal_presencechanged", fn_onpresencechanged);
                             resolve(ErrorManager.getErrorManager().OK);
                         });
                         that._xmpp.setPresence("away", message);
                     } else if (status === "dnd") {
                         that._eventEmitter.once("evt_internal_presencechanged", function fn_onpresencechanged(presence) {
                             that._logger.log("info", LOG_ID + "(_setUserPresenceStatus) received.");
                             that._logger.log("internal", LOG_ID + "(_setUserPresenceStatus) received : ", presence);
                             that._eventEmitter.removeListener("evt_internal_presencechanged", fn_onpresencechanged);
                             resolve(ErrorManager.getErrorManager().OK);
                         });
                         that._xmpp.setPresence("dnd", message);
                     } else if (status === "xa") {
                         that._eventEmitter.once("evt_internal_presencechanged", function fn_onpresencechanged(presence) {
                             that._logger.log("info", LOG_ID + "(_setUserPresenceStatus) received.");
                             that._logger.log("internal", LOG_ID + "(_setUserPresenceStatus) received : ", presence);
                             that._eventEmitter.removeListener("evt_internal_presencechanged", fn_onpresencechanged);
                             resolve(ErrorManager.getErrorManager().OK);
                         });
                         that._xmpp.setPresence("xa", message);
                     } else {
                         let error = ErrorManager.getErrorManager().BAD_REQUEST;
                         return reject(error);
                     }
                 }
             }
             if (that._useS2S) {
                 if (status === "online") {
                     that.manualState = false;
                     that._eventEmitter.once("evt_internal_presencechanged", function fn_onpresencechanged(presence) {
                         that._logger.log("info", LOG_ID + "(_setUserPresenceStatus) received.");
                         that._logger.log("internal", LOG_ID + "(_setUserPresenceStatus) received : ", presence);
                         that._eventEmitter.removeListener("evt_internal_presencechanged", fn_onpresencechanged);
                         resolve();
                     });
                     await that._s2s.sendS2SPresence({"show" : null, "status" : status});
                 } else {
                     that.manualState = true;
                     if (status === "away") {
                         that._eventEmitter.once("evt_internal_presencechanged", function fn_onpresencechanged(presence) {
                             that._logger.log("info", LOG_ID + "(_setUserPresenceStatus) received.");
                             that._logger.log("internal", LOG_ID + "(_setUserPresenceStatus) received : ", presence);
                             that._eventEmitter.removeListener("evt_internal_presencechanged", fn_onpresencechanged);
                             resolve(ErrorManager.getErrorManager().OK);
                         });
                         await that._s2s.sendS2SPresence({"show" : "away", "status" : message});
                     } else if (status === "dnd") {
                         that._eventEmitter.once("evt_internal_presencechanged", function fn_onpresencechanged(presence) {
                             that._logger.log("info", LOG_ID + "(_setUserPresenceStatus) received.");
                             that._logger.log("internal", LOG_ID + "(_setUserPresenceStatus) received : ", presence);
                             that._eventEmitter.removeListener("evt_internal_presencechanged", fn_onpresencechanged);
                             resolve(ErrorManager.getErrorManager().OK);
                         });
                         await that._s2s.sendS2SPresence({"show" : "dnd", "status" : message});
                     } else if (status === "xa") {
                         that._eventEmitter.once("evt_internal_presencechanged", function fn_onpresencechanged(presence) {
                             that._logger.log("info", LOG_ID + "(_setUserPresenceStatus) received.");
                             that._logger.log("internal", LOG_ID + "(_setUserPresenceStatus) received : ", presence);
                             that._eventEmitter.removeListener("evt_internal_presencechanged", fn_onpresencechanged);
                             resolve(ErrorManager.getErrorManager().OK);
                         });
                         await that._s2s.sendS2SPresence({"show" : "xa", "status" : message});
                     } else {
                         let error = ErrorManager.getErrorManager().BAD_REQUEST;
                         return reject(error);
                     }
                 }
                 //resolve (that._s2s.sendS2SPresence( { show:"", status: ""} ));
             } // */
         });
     }

    /**
     * @private
     * @method _sendPresenceFromConfiguration
     * @instance
     * @description
     *      Send user presence according to user settings presence.
     */
    _sendPresenceFromConfiguration() {
        let that = this;
        return new Promise( (resolve, reject) => {
            let presenceRainbow : PresenceRainbow = new PresenceRainbow();
            that._settings.getUserSettings().then(function(settings : any) {
                    //let message = "";
                    presenceRainbow.presenceLevel = settings.presence;
                    /*if (presence === "invisible") {
                        presence = "xa";
                    } else if (presence === "away") {
                        presence = "xa";
                        message = "away";
                    } // */

                    that._logger.log("internal", LOG_ID + "(_sendPresenceFromConfiguration) -> getUserSettings are ", presenceRainbow );
                    //if (that._currentPresence && (that._currentPresence !== presence || (that._currentPresence. === "xa" && message !== that._currentPresence.status))) {
                    //if (that._currentPresence && (that._currentPresence.presenceLevel !== presenceRainbow.presenceLevel )) {
                    if (that._currentPresence ) {
                        that._logger.log("internal", LOG_ID + "(_sendPresenceFromConfiguration) should update my status from ", that._currentPresence,  " to ", presenceRainbow);
                        that._setUserPresenceStatus(presenceRainbow).then(() => { resolve(); }).catch((err) => { reject(err); });
                    } else {
                        resolve();
                    }
                })
                .catch(function(error) {
                    that._logger.log("debug", LOG_ID + "(_sendPresenceFromConfiguration) failure, send online");
                    that._setUserPresenceStatus(new PresenceRainbow()).then(() => { resolve(); }).catch(() => { reject(error); });
                });

        });
    }

    /**
     * @private
     * @method sendInitialBubblePresence
     * @instance
     * @param {Bubble} bubble The Bubble
     * @description
     *      Method called when receiving an invitation to join a bubble
     */
    sendInitialBubblePresence(bubble) {
        let that = this;
        return new Promise(async function(resolve, reject) {
            if (!bubble || !bubble.jid) {
                that._logger.log("debug", LOG_ID + "(sendInitialBubblePresence) failed");
                that._logger.log("info", LOG_ID + "(sendInitialBubblePresence) No roomid provided");
                reject({code:-1, label:"roomid is not defined!!!"});
            }
            else {
                if (that._useXMPP) {
                    resolve(that._xmpp.sendInitialBubblePresence(bubble.jid));
                }
                if (that._useS2S) {
                    let bubbleInfos = await that._bubbles.getBubbleByJid(bubble.jid);
                        resolve(that._s2s.joinRoom(bubbleInfos.id, ROOMROLE.MEMBER));
                }
            }
        });
    }

    /**
     * @private
     * @method _onUserSettingsChanged
     * @instance
     * @description
     *      Method called when receiving an update on user settings
     */
    _onUserSettingsChanged() {
        let that = this;
        that._sendPresenceFromConfiguration();
    }

    /**
     * @private
     * @method _onPresenceChanged
     * @instance
     * @description
     *      Method called when receiving an update on user presence
     */
    _onPresenceChanged(presence) {
        let that = this;
        that._logger.log("debug", LOG_ID + "(_onPresenceChanged) presence : ", presence, ", presence.fulljid : ", presence.fulljid, ", that._xmpp.jid", that._xmpp.jid);
        if ( presence.jid === that._xmpp.jid ) {
            that._logger.log("debug", LOG_ID + "(_onPresenceChanged) set for connected user the presence : ", presence);
            that._currentPresence.presenceLevel = presence.presence;
            that._currentPresence.presenceStatus = presence.status;
        }
    }
}

module.exports.PresenceService = PresenceService;
export {PresenceService } ;
