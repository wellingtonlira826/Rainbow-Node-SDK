"use strict";

import {XMPPService} from "../connection/XMPPService";

export {};

import {ErrorManager} from "../common/ErrorManager";

import  {RESTService} from "../connection/RESTService";

const LOG_ID = "ADMIN - ";

/**
 * @class
 * @name Admin
 * @description
 *      This module handles the management of users. Using it, You will be able to create new users, to modify information of users and to delete them.<br>
 *      This module can be use too to create Guest users who are specific temporaly users that can be used in Rainbow.
 *      <br><br>
 *      The main methods proposed in that module allow to: <br>
 *      - Create a new user in a specified company <br>
 *      - Modify information of an existing user <br>
 *      - Delete an existing user <br>
 *      - Invite a user in Rainbow <br>
 *      - Change the password of a user <br>
 *      - Create a guest user
 */
class Admin {
    public _xmpp: XMPPService;
    public _rest: RESTService;
    public _bubbles: any;
    public _eventEmitter: any;
    public _logger: any;

    constructor(_eventEmitter, _logger) {
        this._xmpp = null;
        this._rest = null;
        this._bubbles = null;
        this._eventEmitter = _eventEmitter;
        this._logger = _logger;
    }

    start(_xmpp : XMPPService, _rest : RESTService) {
        let that = this;

        that._logger.log("debug", LOG_ID + "(start) _entering_");

        return new Promise(function (resolve, reject) {
            try {
                that._xmpp = _xmpp;
                that._rest = _rest;
                that._logger.log("debug", LOG_ID + "(start) _exiting_");
                resolve();
            } catch (err) {
                that._logger.log("debug", LOG_ID + "(start) _exiting_");
                reject();
            }
        });
    }

    stop() {
        let that = this;

        that._logger.log("debug", LOG_ID + "(stop) _entering_");

        return new Promise(function (resolve, reject) {
            try {
                that._xmpp = null;
                that._rest = null;
                that._logger.log("debug", LOG_ID + "(stop) _exiting_");
                resolve();
            } catch (err) {
                that._logger.log("debug", LOG_ID + "(stop) _exiting_");
                reject(err);
            }
        });
    }

    /**
     * @public
     * @method createCompany
     * @instance
     * @description
     *      Create a company
     * @param {string} strName The name of the new company
     * @param {string} country (optionnel) Company country (ISO 3166-1 alpha3 format, size 3 car)
     * @param {string} state (optionnel)  define a state when country is 'USA' (["ALASKA", "....", "NEW_YORK", "....", "WYOMING"] ), else it is not managed by server. Default value on server side: ALABAMA
     * @memberof Admin
     * @async
     * @return {Promise<Object, ErrorManager>}
     * @fulfil {Object} - Created Company or an error object depending on the result
     * @category async
     */
    createCompany(strName, country, state) {
        let that = this;

        that._logger.log("debug", LOG_ID + "(createCompany) _entering_", strName, country);

        return new Promise(function (resolve, reject) {
            try {
                if (!strName) {
                    that._logger.log("error", LOG_ID + "(createCompany) bad or empty 'strName' parameter");
                    that._logger.log("debug", LOG_ID + "(createCompany) _exiting_");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                that._rest.createCompany(strName, country, state).then((company) => {
                    that._logger.log("debug", LOG_ID + "(createCompany) Successfully created company", strName);
                    resolve(company);
                }).catch((err) => {
                    that._logger.log("error", LOG_ID + "(createCompany) ErrorManager when creating", strName);
                    reject(err);
                });

                that._logger.log("debug", LOG_ID + "(createCompany) _exiting_");

            } catch (err) {
                that._logger.log("debug", LOG_ID + "(createCompany) _exiting_");
                reject(err);
            }
        });
    }

    /**
     * Remove a user from a company
     * @private
     */
    removeUserFromCompany(user) {
        let that = this;

        return that.deleteUser(user.id);
    }

    /**
     * Set the visibility for a company
     * @private
     */
    setVisibilityForCompany(company, visibleByCompany) {

        let that = this;

        that._logger.log("debug", LOG_ID + "(setVisibilityForCompany) _entering_", company);

        return new Promise(function (resolve, reject) {
            try {
                if (!company) {
                    that._logger.log("error", LOG_ID + "(setVisibilityForCompany) bad or empty 'company' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }
                if (!visibleByCompany) {
                    that._logger.log("error", LOG_ID + "(setVisibilityForCompany) bad or empty 'visibleByCompany' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                that._rest.setVisibilityForCompany(company.id, visibleByCompany.id).then((user) => {
                    that._logger.log("debug", LOG_ID + "(setVisibilityForCompany) Successfully set visibility for company", company);
                    resolve(user);
                }).catch((err) => {
                    that._logger.log("error", LOG_ID + "(setVisibilityForCompany) ErrorManager when set visibility for company", company);
                    reject(err);
                });

                that._logger.log("debug", LOG_ID + "(setVisibilityForCompany) _exiting_");

            } catch (err) {
                that._logger.log("debug", LOG_ID + "(setVisibilityForCompany) _exiting_", err);
                reject(err);
            }
        });
    }

    /**
     * @public
     * @method createUserInCompany
     * @instance
     * @description
     *      Create a new user in a given company
     * @param {string} email The email of the user to create
     * @param {string} password The associated password
     * @param {string} firstname The user firstname
     * @param {string} lastname  The user lastname
     * @param {string} [companyId="user company"] The Id of the company where to create the user or the connected user company if null
     * @param {string} [language="en-US"] The language of the user. Default is `en-US`. Can be fr-FR, de-DE...
     * @param {boolean} [isCompanyAdmin=false] True to create the user with the right to manage the company (`companyAdmin`). False by default.
     * @param {Array<string>} [roles] The roles the created user.
     * @memberof Admin
     * @async
     * @return {Promise<Contact, ErrorManager>}
     * @fulfil {Contact} - Created contact in company or an error object depending on the result
     * @category async
     */
    createUserInCompany(email, password, firstname, lastname, companyId, language, isCompanyAdmin, roles) {
        let that = this;

        that._logger.log("debug", LOG_ID + "(createUserInCompany) _entering_");

        return new Promise(function (resolve, reject) {
            try {

                language = language || "en-US";

                let isAdmin = isCompanyAdmin || false;

                if (!email) {
                    that._logger.log("error", LOG_ID + "(createUserInCompany) bad or empty 'email' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                if (!password) {
                    that._logger.log("error", LOG_ID + "(createUserInCompany) bad or empty 'password' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                if (!firstname) {
                    that._logger.log("error", LOG_ID + "(createUserInCompany) bad or empty 'firstname' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                if (!lastname) {
                    that._logger.log("error", LOG_ID + "(createUserInCompany) bad or empty 'lastname' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                that._rest.createUser(email, password, firstname, lastname, companyId, language, isAdmin, roles).then((user) => {
                    that._logger.log("debug", LOG_ID + "(createUserInCompany) Successfully created user for account", email);
                    resolve(user);
                }).catch((err) => {
                    that._logger.log("error", LOG_ID + "(createUserInCompany) ErrorManager when creating user for account", email);
                    reject(err);
                });

                that._logger.log("debug", LOG_ID + "(createUserInCompany) _exiting_");
            } catch (err) {
                that._logger.log("debug", LOG_ID + "(createUserInCompany) _exiting_");
                reject(err);
            }
        });
    }

    /**
     * @public
     * @method createGuestUser
     * @instance
     * @description
     *      Create a new guest user in the same company as the requester admin
     * @param {string} firstname The user firstname
     * @param {string} lastname  The user lastname
     * @param {string} [language="en-US"] The language of the user. Default is `en-US`. Can be fr-FR, de-DE...
     * @param {Number} [timeToLive] Allow to provide a duration in second to wait before starting a user deletion from the creation date
     * @memberof Admin
     * @async
     * @return {Promise<Object, ErrorManager>}
     * @fulfil {Object} - Created guest user in company or an error object depending on the result
     * @category async
     */
    createGuestUser(firstname, lastname, language, timeToLive) {
        let that = this;

        this._logger.log("debug", LOG_ID + "(createGuestUser) _entering_");

        return new Promise(function (resolve, reject) {
            try {

                language = language || "en-US";

                if (!firstname) {
                    that._logger.log("error", LOG_ID + "(createGuestUser) bad or empty 'firstname' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                if (!lastname) {
                    that._logger.log("error", LOG_ID + "(createGuestUser) bad or empty 'lastname' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                if (timeToLive && isNaN(timeToLive)) {
                    that._logger.log("error", LOG_ID + "(createGuestUser) bad or empty 'timeToLive' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                that._rest.createGuestUser(firstname, lastname, language, timeToLive).then((user : any) => {
                    that._logger.log("debug", LOG_ID + "(createGuestUser) Successfully created guest user for account ", user.loginEmail);
                    resolve(user);
                }).catch((err) => {
                    that._logger.log("error", LOG_ID + `(createGuestUser) Error when creating guest user with firstname: ${firstname}, lastname: ${lastname}`);
                    reject(err);
                });

                that._logger.log("debug", LOG_ID + "(createGuestUser) _exiting_");
            } catch (err) {
                that._logger.log("debug", LOG_ID + "(createGuestUser) _exiting_");
                reject(err);
            }
        });
    }

    /**
     * @public
     * @method createAnonymousGuestUser
     * @since 1.31
     * @instance
     * @description
     *      Create a new anonymous guest user in the same company as the requester admin
     *      Anonymous guest user is user without name and firstname
     * @param {Number} [timeToLive] Allow to provide a duration in second to wait before starting a user deletion from the creation date
     * @memberof Admin
     * @async
     * @return {Promise<Object, ErrorManager>}
     * @fulfil {Object} - Created anonymous guest user in company or an error object depending on the result
     * @category async
     */
    createAnonymousGuestUser(timeToLive) {
        let that = this;

        this._logger.log("debug", LOG_ID + "(createAnonymousGuestUser) _entering_");

        return new Promise(function (resolve, reject) {
            try {

                if (timeToLive && isNaN(timeToLive)) {
                    that._logger.log("error", LOG_ID + "(createAnonymousGuestUser) bad or empty 'timeToLive' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                that._rest.createGuestUser(null, null, null, timeToLive).then((user : any) => {
                    that._logger.log("debug", LOG_ID + "(createAnonymousGuestUser) Successfully created guest user for account ", user.loginEmail);
                    resolve(user);
                }).catch((err) => {
                    that._logger.log("error", LOG_ID + "(createAnonymousGuestUser) ErrorManager when creating anonymous guest user");
                    reject(err);
                });

                that._logger.log("debug", LOG_ID + "(createAnonymousGuestUser) _exiting_");
            } catch (err) {
                that._logger.log("debug", LOG_ID + "(createAnonymousGuestUser) _exiting_");
                reject(err);
            }
        });
    }

    /**
     * @public
     * @method inviteUserInCompany
     * @instance
     * @description
     *      Invite a new user to join a company in Rainbow
     * @param {string} email The email address of the contact to invite
     * @param {string} companyId     The id of the company where the user will be invited in
     * @param {string} [language="en-US"]  The language of the message to send. Default is `en-US`
     * @param {string} [message=""] A custom message to send
     * @memberof Admin
     * @async
     * @return {Promise<Object, ErrorManager>}
     * @fulfil {Object} - Created invitation or an error object depending on the result
     * @category async
     */
    inviteUserInCompany(email, companyId, language, message) {
        let that = this;

        this._logger.log("debug", LOG_ID + "(inviteUserInCompany) _entering_");

        return new Promise(function (resolve, reject) {
            try {

                language = language || "en-US";

                message = message || null;

                if (!email) {
                    that._logger.log("error", LOG_ID + "(inviteUserInCompany) bad or empty 'email' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                if (!companyId) {
                    that._logger.log("error", LOG_ID + "(inviteUserInCompany) bad or empty 'companyId' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                that._rest.inviteUser(email, companyId, language, message).then((user) => {
                    that._logger.log("debug", LOG_ID + "(inviteUserInCompany) Successfully inviting user for account", email);
                    resolve(user);
                }).catch((err) => {
                    that._logger.log("error", LOG_ID + "(inviteUserInCompany) ErrorManager when inviting user for account", email);
                    reject(err);
                });

                that._logger.log("debug", LOG_ID + "(inviteUserInCompany) _exiting_");
            } catch (err) {
                that._logger.log("debug", LOG_ID + "(inviteUserInCompany) _exiting_");
                reject(err);
            }
        });
    }

    /**
     * @public
     * @method changePasswordForUser
     * @instance
     * @description
     *      Change a password for a user
     * @param {string} password The new password
     * @param {string} userId The id of the user
     * @memberof Admin
     * @async
     * @return {Promise<Object, ErrorManager>}
     * @fulfil {Object} - Updated user or an error object depending on the result
     * @category async
     */
    changePasswordForUser(password, userId) {

        let that = this;

        this._logger.log("debug", LOG_ID + "(changePasswordToUser) _entering_");

        return new Promise(function (resolve, reject) {
            try {

                if (!password) {
                    that._logger.log("error", LOG_ID + "(changePasswordToUser) bad or empty 'password' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                if (!userId) {
                    that._logger.log("error", LOG_ID + "(changePasswordToUser) bad or empty 'userId' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                that._rest.changePassword(password, userId).then((user) => {
                    that._logger.log("debug", LOG_ID + "(changePasswordToUser) Successfully changing password for user account", userId);
                    resolve(user);
                }).catch((err) => {
                    that._logger.log("error", LOG_ID + "(changePasswordToUser) ErrorManager when changing password for user account", userId);
                    reject(err);
                });

                that._logger.log("debug", LOG_ID + "(changePasswordToUser) _exiting_");
            } catch (err) {
                that._logger.log("debug", LOG_ID + "(changePasswordToUser) _exiting_");
                reject(err);
            }
        });
    }

    /**
     * @public
     * @method updateInformationForUser
     * @instance
     * @description
     *      Change information of a user. Fields that can be changed: `firstName`, `lastName`, `nickName`, `title`, `jobTitle`, `country`, `language`, `timezone`, `emails`
     * @param {Object} objData An object (key: value) containing the data to change with their new value
     * @param {string} userId The id of the user
     * @memberof Admin
     * @async
     * @return {Promise<Object, ErrorManager>}
     * @fulfil {Object} - Updated user or an error object depending on the result
     * @category async
     */
    updateInformationForUser(objData, userId) {

        let that = this;

        this._logger.log("debug", LOG_ID + "(updateInformationForUser) _entering_");

        return new Promise(function (resolve, reject) {
            try {

                if (!objData) {
                    that._logger.log("error", LOG_ID + "(updateInformationForUser) bad or empty 'objData' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                if ("loginEmail" in objData) {
                    that._logger.log("error", LOG_ID + "(updateInformationForUser) can't change the loginEmail with that API");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                if ("password" in objData) {
                    that._logger.log("error", LOG_ID + "(updateInformationForUser) can't change the password with that API");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                that._rest.updateInformation(objData, userId).then((user) => {
                    that._logger.log("debug", LOG_ID + "(updateInformationForUser) Successfully changing information for user account", userId);
                    resolve(user);
                }).catch((err) => {
                    that._logger.log("error", LOG_ID + "(updateInformationForUser) ErrorManager when changing information for user account", userId);
                    reject(err);
                });

                that._logger.log("debug", LOG_ID + "(updateInformationForUser) _exiting_");
            } catch (err) {
                that._logger.log("debug", LOG_ID + "(updateInformationForUser) _exiting_");
                reject(err);
            }
        });
    }

    /**
     * @public
     * @method deleteUser
     * @instance
     * @description
     *      Delete an existing user
     * @param {string} userId The id of the user
     * @memberof Admin
     * @async
     * @return {Promise<Object, ErrorManager>}
     * @fulfil {Object} - Deleted user or an error object depending on the result
     * @category async
     */
    deleteUser(userId) {

        let that = this;

        this._logger.log("debug", LOG_ID + "(deleteUser) _entering_");

        return new Promise(function (resolve, reject) {
            try {

                if (!userId) {
                    that._logger.log("error", LOG_ID + "(deleteUser) bad or empty 'userId' parameter");
                    reject(ErrorManager.getErrorManager().BAD_REQUEST);
                    return;
                }

                that._rest.deleteUser(userId).then((user) => {
                    that._logger.log("debug", LOG_ID + "(deleteUser) Successfully deleting user account", userId);
                    that._logger.log("internal", LOG_ID + "(deleteUser) Successfully deleting user ", user);
                    resolve(user);
                }).catch((err) => {
                    that._logger.log("error", LOG_ID + "(deleteUser) ErrorManager when deleting user account", userId);
                    reject(err);
                });

                that._logger.log("debug", LOG_ID + "(deleteUser) _exiting_");
            } catch (err) {
                that._logger.log("debug", LOG_ID + "(deleteUser) _exiting_");
                reject(err);
            }
        });
    }

    /**
     * @public
     * @method getAllCompanies
     * @instance
     * @description
     *      Get all companies for a given admin
     * @param {string} userId The id of the user
     * @memberof Admin
     * @async
     * @return {Promise<Object, ErrorManager>}
     * @fulfil {Object} - Json object containing with all companies (companyId and companyName) or an error object depending on the result
     * @category async
     */
    getAllCompanies() {
        let that = this;

        this._logger.log("debug", LOG_ID + "(getAllCompanies) _entering_");

        return new Promise(function (resolve, reject) {
            try {

                that._rest.getAllCompanies().then((companies : any) => {
                    that._logger.log("debug", LOG_ID + "(getAllCompanies) Successfully get all companies");
                    that._logger.log("debug", LOG_ID + "(getAllCompanies) : companies values : ", companies.data);
                    resolve(companies);
                }).catch(function (err) {
                    that._logger.log("error", LOG_ID + "(getAllCompanies) ErrorManager when get All companies");
                    reject(err);
                });

                that._logger.log("debug", LOG_ID + "(getAllCompanies) _exiting_");

            } catch (err) {
                that._logger.log("debug", LOG_ID + "(getAllCompanies) _exiting_");
                reject(err);
            }
        });
    }

    /**
     * get a company
     * @private
     */
    getCompanyById(companyId) {
        let that = this;

        this._logger.log("debug", LOG_ID + "(getCompanyById) _entering_");

        return new Promise((resolve, reject) => {
            try {

                that._rest.getCompany(companyId).then((company : any) => {
                    that._logger.log("debug", LOG_ID + "(getCompanyById) Successfully get a company");
                    that._logger.log("debug", LOG_ID + "(getCompanyById) : companies values : ", company.data);
                    resolve(company.data);
                }).catch((err) => {
                    that._logger.log("error", LOG_ID + "(getCompanyById) ErrorManager when get a company");
                    reject(err);
                });

                that._logger.log("debug", LOG_ID + "(getCompanyById) _exiting_");

            } catch (err) {
                that._logger.log("debug", LOG_ID + "(getCompanyById) _exiting_");
                reject(err);
            }
        });
    }

    /**
     * Remove a company
     * @private
     */
    removeCompany(company) {
        let that = this;

        this._logger.log("debug", LOG_ID + "(deleteCompany) _entering_");
        this._logger.log("internal", LOG_ID + "(deleteCompany) _entering_ : company : ", company);

        return new Promise(function (resolve, reject) {
            try {

                that._rest.deleteCompany(company.id).then((companies : any) => {
                    that._logger.log("debug", LOG_ID + "(deleteCompany) Successfully remove company");
                    that._logger.log("debug", LOG_ID + "(deleteCompany) : companies values : ", companies.data);
                    resolve(companies);
                }).catch(function (err) {
                    that._logger.log("error", LOG_ID + "(deleteCompany) ErrorManager when removing company");
                    reject(err);
                });

                that._logger.log("debug", LOG_ID + "(deleteCompany) _exiting_");

            } catch (err) {
                that._logger.log("debug", LOG_ID + "(deleteCompany) _exiting_");
                reject(err);
            }
        });
    }

    /**
     * @public
     * @method askTokenOnBehalf
     * @instance
     * @description
     *      Ask Rainbow for a token on behalf a user
     *      This allow to not use the secret key on client side
     * @param {string} loginEmail The user login email
     * @param {string} password The user password
     * @memberof Admin
     * @async
     * @return {Promise<Object, Error>}
     * @fulfil {Object} - Json object containing the user data, application data and token
     * @category async
     */
    askTokenOnBehalf(loginEmail, password) {
        let that = this;

        this._logger.log("debug", LOG_ID + "(getGuestOrUserToken) _entering_");

        return new Promise(function (resolve, reject) {
            try {
                that._rest.askTokenOnBehalf(loginEmail, password).then(json => {
                    that._logger.log("debug", LOG_ID + "(getGuestOrUserToken) Successfully logged-in a user");
                    that._logger.log("debug", LOG_ID + "(getGuestOrUserToken) : user data : ", json);
                    resolve(json);
                }).catch(function (err) {
                    that._logger.log("error", LOG_ID + "(getGuestOrUserToken) Error when getting a token");
                    reject(err);
                });

                that._logger.log("debug", LOG_ID + "(getGuestOrUserToken) _exiting_");
            } catch (err) {
                that._logger.log("debug", LOG_ID + "(getGuestOrUserToken) _exiting_");
                reject(err);
            }
        });
    }
}

module.exports = Admin;
