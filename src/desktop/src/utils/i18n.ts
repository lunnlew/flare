/**
 * i18n - Internationalization utilities
 *
 * Simple key-based translation system with Chinese and English support.
 */

export type Language = 'zh-CN' | 'en-US';

export interface TranslationKey {
  // App Settings
  'settings.title': string;
  'settings.general': string;
  'settings.appearance': string;
  'settings.request': string;
  'settings.proxy': string;
  'settings.ssl': string;
  'settings.capture': string;
  'settings.shortcuts': string;
  'settings.save': string;
  'settings.privacy': string;
  'settings.backup': string;
  'settings.exportSettings': string;
  'settings.exportSettings.desc': string;
  'settings.importSettings': string;
  'settings.importSettings.desc': string;
  'settings.importWarning': string;
  'settings.exported': string;
  'settings.imported': string;
  'settings.importFailed': string;
  'settings.region': string;
  'settings.font': string;
  'settings.seconds': string;
  'settings.minutes': string;
  'settings.oneMinute': string;
  'settings.twoMinutes': string;
  'settings.fiveMinutes': string;
  'settings.twoSpaces': string;
  'settings.fourSpaces': string;
  'settings.timeout': string;
  'settings.redirect': string;
  'settings.clientCertificate': string;
  'settings.certFile': string;
  'settings.keyFile': string;
  'settings.caCertFile': string;
  'settings.timeout5s': string;
  'settings.timeout10s': string;
  'settings.timeout15s': string;
  'settings.timeout30s': string;
  'settings.timeout60s': string;
  'settings.timeout120s': string;

  // Audit Log
  'audit.title': string;
  'audit.operationAuditLog': string;
  'audit.recordCount': string;
  'audit.export': string;
  'audit.clear': string;
  'audit.categoryFilter': string;
  'audit.all': string;
  'audit.searchPlaceholder': string;
  'audit.noAuditLogs': string;
  'audit.exportTitle': string;
  'audit.exportMessage': string;
  'audit.cancel': string;
  'audit.confirmClear': string;
  'audit.clearConfirmTitle': string;
  'audit.clearConfirmMessage': string;
  'audit.cleared': string;

  // App
  'app.loading': string;
  'app.theme.dark': string;
  'app.theme.light': string;
  'app.theme.blue': string;
  'app.theme.notion': string;
  'app.theme.vermont': string;
  'app.expand': string;
  'app.collapse': string;

  // Diff Viewer
  'diff.loading': string;
  'diff.noDiff': string;
  'diff.linesAdded': string;
  'diff.linesRemoved': string;
  'diff.selectCommitA': string;
  'diff.selectCommitB': string;
  'diff.compare': string;

  // Mock Server
  'mock.title': string;
  'mock.loadStatusFailed': string;
  'mock.loadRulesFailed': string;
  'mock.portRangeError': string;
  'mock.startedOnPort': string;
  'mock.startFailed': string;
  'mock.stopped': string;
  'mock.stopFailed': string;
  'mock.newRule': string;
  'mock.ruleAdded': string;
  'mock.ruleAddFailed': string;
  'mock.ruleDeleted': string;
  'mock.ruleDeleteFailed': string;
  'mock.ruleUpdateFailed': string;
  'mock.requestLogCleared': string;
  'mock.requestLogClearFailed': string;
  'mock.serverDescription': string;
  'mock.runningOnPort': string;
  'mock.port': string;
  'mock.stopping': string;
  'mock.stop': string;
  'mock.starting': string;
  'mock.start': string;
  'mock.rules': string;
  'mock.requests': string;
  'mock.mockRules': string;
  'mock.addRule': string;
  'mock.addRuleHint': string;
  'mock.noRules': string;
  'mock.delete': string;
  'mock.allMethods': string;
  'mock.anyPath': string;
  'mock.requestLog': string;
  'mock.clearLog': string;
  'mock.viewLogHint': string;
  'mock.noRequestLog': string;
  'mock.usageInstructions': string;
  'mock.startServerAndNotePort': string;
  'mock.useLocalhostPrefix': string;
  'mock.addMatchingRules': string;
  'mock.mockServerIntercepts': string;
  'mock.portMustBe1024': string;

  // General
  'common.save': string;
  'common.cancel': string;
  'common.confirm': string;
  'common.delete': string;
  'common.edit': string;
  'common.add': string;
  'common.enabled': string;
  'common.disabled': string;
  'common.on': string;
  'common.off': string;
  'common.yes': string;
  'common.no': string;
  'common.reset': string;
  'common.resetAll': string;
  'common.rename': string;
  'common.export': string;
  'common.import': string;
  'common.search': string;
  'common.loading': string;
  'common.search.placeholder': string;
  'common.noContent': string;
  'common.importToStart': string;
  'common.moveTo': string;
  'common.insert': string;
  'common.lock': string;
  'common.unlock': string;
  'common.description': string;
  'common.addDescription': string;

  // Code Gen
  'codegen.title': string;
  'codegen.copyCode': string;
  'codegen.codeCopied': string;
  'codegen.noRequestData': string;
  'common.close': string;
  'common.copy': string;
  'common.error': string;
  'common.success': string;
  'common.true': string;
  'common.false': string;

  // Common Errors
  'common.error.urlRequired': string;
  'common.error.requestCancelled': string;
  'common.error.sslCertReadFailed': string;
  'common.error.mockPreviewFailed': string;

  // OAuth Errors
  'oauth.error.incompleteConfig': string;
  'oauth.error.cannotOpenBrowser': string;
  'oauth.error.enterAuthCode': string;
  'oauth.error.tokenExchangeFailed': string;
  'oauth.error.ensureRefreshToken': string;
  'oauth.error.refreshFailed': string;
  'oauth.error.incompleteTokenConfig': string;
  'oauth.error.clientCredentialsFailed': string;

  // Script Errors
  'script.error.empty': string;
  'script.error.executionFailed': string;
  'script.error.executionComplete': string;
  'script.warn.preBuild': string;
  'script.warn.preSend': string;
  'script.warn.postResponse': string;

  // Field Editor
  'field.title': string;
  'field.field': string;
  'field.genType': string;
  'field.suffix': string;
  'field.suffixNone': string;
  'field.suffixSeq': string;
  'field.suffixCustom': string;
  'field.customSuffix': string;
  'field.preview': string;
  'field.apply': string;
  'field.cancel': string;
  'field.loading': string;
  'field.empty': string;

  // GraphQL Schema Docs
  'graphql.schemaDocs': string;
  'graphql.typesCount': string;
  'graphql.searchTypes': string;
  'graphql.all': string;
  'graphql.object': string;
  'graphql.input': string;
  'graphql.enum': string;
  'graphql.interface': string;
  'graphql.union': string;
  'graphql.noMatch': string;

  // Toast Messages
  'toast.collectionRenamed': string;
  'toast.requestRenamed': string;
  'toast.collectionDeleted': string;
  'toast.requestDeleted': string;
  'toast.collectionExported': string;
  'toast.movedTo': string;

  // Appearance
  'appearance.theme': string;
  'appearance.theme.dark': string;
  'appearance.theme.light': string;
  'appearance.theme.system': string;
  'appearance.theme.blue': string;
  'appearance.theme.notion': string;
  'appearance.theme.vermont': string;
  'appearance.fontSize': string;
  'appearance.tabSize': string;
  'appearance.lineHeight': string;
  'appearance.fontSize.compact': string;
  'appearance.fontSize.normal': string;
  'appearance.fontSize.relaxed': string;
  'appearance.theme.description': string;
  'appearance.fontSize.description': string;
  'appearance.tabSize.description': string;
  'appearance.lineHeight.description': string;

  // General Settings
  'general.autoSave': string;
  'general.autoSave.description': string;
  'general.autoSaveInterval': string;
  'general.sensitiveMask': string;
  'general.sensitiveMask.description': string;
  'general.language': string;
  'general.language.description': string;
  'general.languageChinese': string;
  'general.languageEnglish': string;
  'general.seconds': string;
  'general.minute': string;
  'general.minutes': string;

  // Request Settings
  'request.timeout': string;
  'request.timeout.description': string;
  'request.followRedirects': string;
  'request.followRedirects.description': string;

  // Proxy Settings
  'proxy.enable': string;
  'proxy.enable.description': string;
  'proxy.protocol': string;
  'proxy.host': string;
  'proxy.port': string;
  'proxy.username': string;
  'proxy.password': string;
  'proxy.url': string;

  // SSL Settings
  'ssl.enableMtls': string;
  'ssl.enableMtls.description': string;
  'ssl.clientCert': string;
  'ssl.privateKey': string;
  'ssl.caCert': string;

  // Capture Settings
  'capture.enable': string;
  'capture.enable.description': string;
  'capture.allowedDomains': string;
  'capture.allowedDomains.description': string;
  'capture.excludePatterns': string;
  'capture.excludePatterns.description': string;
  'capture.addDomain': string;
  'capture.addPattern': string;
  'capture.noRestrictions': string;
  'capture.placeholder.domain': string;
  'capture.placeholder.pattern': string;
  'capture.capturedRequests': string;
  'capture.clickToExpand': string;
  'capture.clear': string;
  'capture.collapse': string;
  'capture.moreRequests': string;
  'capture.noCapturedRequests': string;
  'capture.connected': string;
  'capture.disconnected': string;

  // Shortcuts
  'shortcuts.title': string;
  'shortcuts.description': string;

  // Workspace
  'workspace.apis': string;
  'workspace.collections': string;
  'workspace.capture': string;
  'workspace.noEndpoints': string;

  // Request Builder
  'request.url': string;
  'request.send': string;
  'request.method': string;
  'request.params': string;
  'request.headers': string;
  'request.body': string;
  'request.auth': string;
  'request.response': string;
  'request.urlPlaceholder': string;
  'request.detail': string;
  'request.preview': string;
  'request.rawUrl': string;
  'request.binaryResponse': string;
  'request.xmlResponse': string;
  'request.textResponse': string;
  'request.noSchema': string;
  'request.updateRequest': string;
  'request.saveRequest': string;
  'request.requestName': string;
  'request.inputRequestName': string;
  'request.urlNone': string;
  'request.saving': string;
  'request.update': string;
  'request.save': string;

  // Scripts Completion
  'scripts.completion.environment': string;
  'scripts.completion.utils': string;
  'scripts.completion.variables': string;
  'scripts.completion.lodash': string;
  'scripts.completion.console': string;
  'scripts.completion.test': string;
  'scripts.completion.expect': string;
  'scripts.completion.request': string;
  'scripts.completion.response': string;
  'scripts.completion.setTimeout': string;
  'scripts.completion.info': string;
  'scripts.completion.getEnv': string;
  'scripts.completion.setEnv': string;
  'scripts.completion.toObject': string;
  'scripts.completion.sha256': string;
  'scripts.completion.md5': string;
  'scripts.completion.randomUuid': string;
  'scripts.completion.urlEncode': string;
  'scripts.completion.urlDecode': string;
  'scripts.completion.base64Encode': string;
  'scripts.completion.base64Decode': string;
  'scripts.completion.getVar': string;
  'scripts.completion.setVar': string;
  'scripts.completion.hasVar': string;
  'scripts.completion.getNested': string;
  'scripts.completion.setNested': string;
  'scripts.completion.hasProp': string;
  'scripts.completion.pick': string;
  'scripts.completion.omit': string;
  'scripts.completion.merge': string;
  'scripts.completion.cloneDeep': string;
  'scripts.completion.map': string;
  'scripts.completion.filter': string;
  'scripts.completion.find': string;
  'scripts.completion.log': string;
  'scripts.completion.warn': string;
  'scripts.completion.error': string;
  'scripts.completion.url': string;
  'scripts.completion.method': string;
  'scripts.completion.deleteEnv': string;
  'scripts.completion.deleteVar': string;
  'scripts.completion.params': string;
  'scripts.completion.headers': string;
  'scripts.completion.value': string;
  'scripts.completion.bodyJson': string;
  'scripts.completion.body': string;
  'scripts.completion.resBody': string;
  'scripts.completion.statusCode': string;
  'scripts.completion.statusText': string;
  'scripts.completion.resHeaders': string;
  'scripts.completion.resTime': string;
  'scripts.completion.parseJson': string;
  'scripts.completion.getText': string;
  'scripts.completion.resBodyFields': string;
  'scripts.completion.requestId': string;
  'scripts.completion.iteration': string;
  'scripts.completion.iterationCount': string;

  // Test Data Generator
  'generator.sequence': string;
  'generator.random': string;
  'generator.date': string;
  'generator.uuid': string;
  'generator.nullify': string;
  'generator.prefix': string;
  'generator.optionalPrefix': string;
  'generator.preview': string;
  'generator.fillEmptyOnly': string;
  'generator.apply': string;
  'generator.close': string;

  // Schema Tree Editor
  'schema.rootNode': string;
  'schema.fieldName': string;
  'schema.description': string;
  'schema.value': string;
  'schema.enabled': string;
  'schema.required': string;
  'schema.addChild': string;
  'schema.delete': string;
  'schema.sample': string;

  // Response
  'response.status': string;
  'response.time': string;
  'response.size': string;
  'response.noResponse': string;

  // Collection Panel
  'collection.operations': string;
  'collection.export': string;
  'collection.duplicate': string;
  'collection.exportCollection': string;
  'collection.copyPostmanJson': string;
  'collection.copyOpenApiJson': string;
  'collection.copyHarJson': string;
  'collection.importFromFile': string;
  'collection.importFromClipboard': string;
  'collection.selectJsonFile': string;
  'collection.pasteJson': string;
  'collection.copiedToClipboard': string;
  'collection.importSuccess': string;
  'collection.importFailed': string;
  'collection.checkJsonFormat': string;
  // List Mode
  'list.searchPlaceholder': string;
  'list.import': string;
  'list.loading': string;
  'list.noApis': string;
  'list.filterEndpoints': string;
  'list.send': string;
  'list.noMatchingEndpoints': string;
  'list.selectApiOnLeft': string;
  'list.semanticSearchMatch': string;

  // Env Panel
  'env.addVariable': string;
  'env.importExport': string;
  'env.export': string;
  'env.import': string;
  'env.importFailed': string;
  'env.exportEnvConfig': string;
  'env.importEnvConfig': string;

  'collection.import': string;

  // Auth Items Form
  'auth.itemsForm': string;
  'auth.addHeader': string;
  'auth.addCookie': string;
  'auth.addQuery': string;
  'auth.addPath': string;
  'auth.headerName': string;
  'auth.headerValue': string;
  'auth.cookieString': string;
  'auth.paramName': string;
  'auth.paramValue': string;
  'auth.pathPlaceholder': string;
  'auth.pathReplaceValue': string;
  'auth.pathReplaceDescription': string;
  'auth.pathReplace': string;

  // Collection
  'collection.new': string;
  'collection.deleteConfirm': string;
  'collection.title': string;
  'collection.savedRequests': string;
  'collection.dragToSort': string;
  'collection.newCollection': string;
  'collection.collectionName': string;
  'collection.cancel': string;
  'collection.create': string;
  'collection.exportAll': string;
  'collection.importCollection': string;
  'collection.duplicateCollection': string;
  'collection.deleteCollection': string;
  'collection.copyCollection': string;

  // Error Boundary
  'error.title': string;
  'error.message': string;
  'error.details': string;
  'error.refresh': string;
  'error.recover': string;

  // Environment Config
  'env.deleteConfirm': string;
  'env.importPlaceholder': string;
  'env.importJson': string;
  'env.cancel': string;
  'env.loading': string;
  'env.newEnv': string;
  'env.deleteEnv': string;
  'env.copyEnv': string;
  'env.exportEnv': string;
  'env.importEnv': string;
  'env.moveUp': string;
  'env.moveDown': string;
  'env.envName': string;
  'env.groupName': string;
  'env.newGroup': string;
  'env.rename': string;
  'env.delete': string;
  'env.variables': string;
  'env.group': string;
  'env.selectGroup': string;
  'env.environment': string;
  'env.environmentVariables': string;

  // Saved Request
  'savedRequest.red': string;
  'savedRequest.orange': string;
  'savedRequest.yellow': string;
  'savedRequest.green': string;
  'savedRequest.cyan': string;
  'savedRequest.blue': string;
  'savedRequest.purple': string;
  'savedRequest.pink': string;
  'savedRequest.none': string;
  'savedRequest.color': string;
  'savedRequest.setColor': string;
  'savedRequest.editTags': string;
  'savedRequest.clearAllTags': string;
  'savedRequest.moveTo': string;
  'savedRequest.enterTagPlaceholder': string;
  'savedRequest.moveToCollection': string;

  'env.envNamePlaceholder': string;
  'env.groupNamePlaceholder': string;
  'env.pleaseInputJson': string;
  'env.pleaseSelectGroup': string;
  'env.variablesLabel': string;
  'env.showAll': string;
  'env.hideAll': string;
  'env.inherited': string;
  'env.toggleSensitive': string;
  'env.duplicateVarName': string;
  'env.noVariables': string;
  'env.emptyKeyName': string;
  'env.keyExists': string;
  'env.invalidKeyName': string;
  'env.addVariableTitle': string;
  'env.variableName': string;
  'env.loadFailed': string;
  'env.envAlreadyExists': string;
  'env.createEnvFailed': string;
  'env.mustKeepOneEnv': string;
  'env.deleteEnvFailed': string;
  'env.envNameAlreadyExists': string;
  'env.renameEnvFailed': string;
  'env.envNotFound': string;
  'env.copyEnvFailed': string;
  'env.sortEnvFailed': string;
  'env.groupAlreadyExists': string;
  'env.addGroupFailed': string;
  'env.mustKeepOneGroup': string;
  'env.deleteGroupFailed': string;
  'env.groupNameAlreadyExists': string;
  'env.renameGroupFailed': string;
  'env.saveVarFailed': string;
  'env.toggleVarFailed': string;
  'env.deleteVarFailed': string;

  // Headers Panel
  'headers.savePreset': string;
  'headers.presetName': string;
  'headers.save': string;
  'headers.managePresets': string;
  'headers.noCustomPresets': string;
  'headers.headersCount': string;
  'headers.delete': string;
  'headers.addPreset': string;
  'headers.custom': string;
  'headers.manage': string;
  'headers.generate': string;
  'headers.reset': string;
  'headers.unlock': string;
  'headers.lock': string;
  'headers.commonHeaders': string;
  'headers.description': string;
  'headers.addDescription': string;
  'headers.addHeader': string;
  'headers.saveAsPreset': string;
  'headers.smartGenerate': string;

  // Params Panel
  'params.title': string;
  'params.autoEncode': string;
  'params.encode': string;
  'params.generate': string;
  'params.reset': string;
  'params.unlock': string;
  'params.lock': string;
  'params.historyValues': string;
  'params.string': string;
  'params.number': string;
  'params.boolean': string;
  'params.array': string;
  'params.editField': string;
  'params.description': string;
  'params.addDescription': string;
  'params.copy': string;
  'params.paste': string;
  'params.addParam': string;
  'params.invalidNumber': string;
  'params.invalidBoolean': string;
  'params.invalidArray': string;
  'params.arrayFormat': string;
  'params.schemaType': string;
  'params.paramType': string;

  // Request Builder
  'request.close': string;
  'request.closeLeft': string;
  'request.closeRight': string;
  'request.closeOthers': string;
  'request.updated': string;
  'request.deleted': string;
  'request.deleteFailed': string;
  'request.savedTo': string;
  'request.saveFailed': string;
  'request.myCollection': string;
  'request.unnamedRequest': string;
  'request.clearConfirm': string;
  'request.confirm': string;
  'request.cancel': string;
  'request.parseUrl': string;
  'request.urlHasParams': string;
  'request.parse': string;
  'request.scripts': string;
  'request.history': string;
  'request.requestDescription': string;
  'request.added': string;
  'request.addRequestDescription': string;
  'request.requestSchema': string;
  'request.parameterCount': string;
  'request.paramName': string;
  'request.rename': string;
  'request.noRequestParams': string;
  'request.collapse': string;
  'request.edit': string;
  'request.responseSchema': string;
  'request.responseDescription': string;
  'request.noResponseDefinition': string;
  'request.binary': string;
  'response.addResponse': string;
  'response.add': string;
  'response.noResponseDefinition': string;
  'response.collapse': string;
  'response.editSchema': string;
  'response.delete': string;
  'response.binaryResponse': string;
  'response.textResponse': string;
  'response.xmlResponse': string;
  'response.noSchemaDefinition': string;

  // URL Bar
  'url.noEnvironment': string;
  'url.history': string;
  'url.preview': string;
  'url.highlight': string;
  'url.replaceValue': string;
  'url.encodePreview': string;
  'url.undefinedVariable': string;
  'url.envVariables': string;
  'url.globalVariables': string;
  'url.send': string;
  'url.cancel': string;
  'url.saveRequest': string;
  'url.save': string;
  'url.code': string;
  'url.settings': string;
  'url.autoParseUrl': string;
  'url.autoEncodeUrl': string;
  'url.sslVerify': string;
  'url.timeout': string;
  'url.noTimeout': string;
  'url.timeoutValue': string;
  'url.retryOnFailure': string;
  'url.maxRetries': string;
  'url.retryDelay': string;
  'url.horizontal': string;
  'url.vertical': string;
  'url.requestFocus': string;
  'url.responseFocus': string;

  // Mock Config
  'mock.title.description': string;
  'mock.generate': string;
  'mock.mock': string;
  'mock.server': string;
  'mock.preview': string;
  'mock.loading': string;
  'mock.names': string;
  'mock.cities': string;
  'mock.builtinRules': string;
  'mock.hide': string;
  'mock.show': string;
  'mock.resetToDefault': string;
  'mock.customRules': string;
  'mock.noCustomRules': string;
  'mock.customRules.description': string;
  'mock.ruleNamePlaceholder': string;
  'mock.addCustomRule': string;
  'mock.fieldMatchRules': string;
  'mock.noFieldMatchRules': string;
  'mock.fieldMatchRules.description': string;
  'mock.patternPlaceholder': string;
  'mock.addFieldMatchRule': string;
  'mock.languageDataPool': string;
  'mock.chinese': string;
  'mock.english': string;
  'mock.current': string;
  'mock.smartDetection': string;
  'mock.autoDetectType': string;
  'mock.smartDetection.description': string;
  'mock.sequenceGeneration': string;
  'mock.prefix': string;
  'mock.startValue': string;
  'mock.zeroPadding': string;
  'mock.example': string;
  'mock.quickGenerate': string;
  'mock.quickGenerate.description': string;
  'mock.quickGenerate.description2': string;
  'mock.responseMock': string;
  'mock.responseMock.description': string;
  'mock.templateVariableRules': string;
  'mock.noTemplateVariableRules': string;
  'mock.templateVariableRules.description': string;
  'mock.variableName': string;
  'mock.addTemplateVariableRule': string;
  'mock.responseRules': string;
  'mock.noResponseRules': string;
  'mock.disabled': string;
  'mock.edit': string;
  'mock.ruleNameLabel': string;
  'mock.ruleNamePlaceholder2': string;
  'mock.requestMethod': string;
  'mock.pathMatch': string;
  'mock.pathMatchPlaceholder': string;
  'mock.statusCode': string;
  'mock.delay': string;
  'mock.responseTemplate': string;
  'mock.responseTemplate.description': string;
  'mock.editRule': string;
  'mock.deleteRule': string;
  'mock.confirmDeleteRule': string;
  'mock.add': string;

  // Flow Canvas
  'flow.stepModeOn': string;
  'flow.stepModeOff': string;
  'flow.stepMode': string;
  'flow.stepExecute': string;
  'flow.continueRun': string;
  'flow.run': string;
  'flow.pause': string;
  'flow.stop': string;
  'flow.reset': string;
  'flow.maxParallelNodes': string;
  'flow.unlimited': string;
  'flow.log': string;
  'flow.noLog': string;
  'flow.result': string;
  'flow.noResult': string;
  'flow.undefinedVariables': string;
  'flow.error.circularDependency': string;
  'flow.configureNode': string;
  'flow.configureNodes': string;
  'flow.addChildNode': string;
  'flow.copyNode': string;
  'flow.copyNodes': string;
  'flow.saveAsSubflow': string;
  'flow.saveNodesAsSubflow': string;
  'flow.runNode': string;
  'flow.runNodes': string;
  'flow.runCurrentNode': string;
  'flow.runDownstream': string;
  'flow.toggleBreakpoint': string;
  'flow.deleteNode': string;
  'flow.deleteNodes': string;
  'flow.pleaseSelectNode': string;
  'flow.savedNodesAsSubflow': string;
  'flow.environment': string;
  'flow.concurrency': string;
  'flow.subflowLibrary': string;
  'flow.insertOrDeleteHint': string;
  'flow.noSubflows': string;
  'flow.createSubflowHint': string;
  'flow.saveFlowAutoSave': string;
  'flow.loadExistingFlow': string;
  'flow.load': string;
  'flow.insertSubflow': string;
  'flow.subflows': string;
  'flow.savedFlows': string;
  'flow.noSavedFlows': string;
  'flow.exportFlow': string;
  'flow.importFlow': string;
  'flow.loadListFailed': string;
  'flow.saveFailed': string;
  'flow.loadFailed': string;
  'flow.deleteFailed': string;
  'flow.importInvalidFormat': string;
  'flow.importInvalidStructure': string;
  'flow.importSuccess': string;
  'flow.importFailed': string;
  'flow.saveSubflowFailed': string;
  'flow.instantiateSubflowFailed': string;
  'flow.exportFailed': string;
  'flow.exportSuccess': string;

  // Flow Auth
  'flowauth.none': string;
  'flowauth.custom': string;
  'flowauth.inputCustomPrefix': string;
  'flowauth.username': string;
  'flowauth.password': string;
  'flowauth.getToken': string;
  'flowauth.copy': string;
  'flow.scope': string;
  'flow.nodeOutput': string;
  'flow.envVariable': string;
  'flow.globalVariable': string;
  'flow.workflowVariable': string;
  'flow.executionInfo': string;
  'flow.collapse': string;
  'flow.executionOrder': string;
  'flow.logs': string;
  'flow.clear': string;
  'flow.results': string;
  'flow.success': string;
  'flow.failure': string;
  'flow.resultCount': string;
  'flow.noResults': string;
  'flow.variableWatch': string;
  'flow.addVariable': string;
  'flow.noVariables': string;
  'flow.useVariableSyntax': string;
  'flow.clickToEdit': string;
  'flow.empty': string;
  'flow.variableSyntax': string;
  'flow.globalVar': string;
  'flow.envVar': string;
  'flow.workflowVar': string;
  'flow.nodeOutputVar': string;
  'flow.syntaxError': string;
  'flow.running': string;
  'flow.runTest': string;
  'flow.availableInputs': string;
  'flow.breakpointEnabled': string;
  'flow.console': string;
  'flow.all': string;
  'flow.info': string;
  'flow.warn': string;
  'flow.error': string;
  'flow.clearLogs': string;
  'flow.consoleOutputHint': string;
  'flow.executionFailed': string;
  'flow.executionStopped': string;
  'flow.pleaseStartStepMode': string;
  'flow.pleaseEnableStepMode': string;
  'flow.steppingCancelled': string;

  // Git Panel
  'git.title': string;
  'git.pleaseInputCommitMessage': string;
  'git.confirmSwitchBranch': string;
  'git.confirmCreateBranch': string;
  'git.worktreeClean': string;
  'git.hasUncommittedChanges': string;
  'git.refresh': string;
  'git.tab.status': string;
  'git.tab.history': string;
  'git.tab.branches': string;
  'git.tab.diff': string;
  'git.loading': string;
  'git.noStatusData': string;
  'git.staged': string;
  'git.unstaged': string;
  'git.untracked': string;
  'git.stageSelectedFiles': string;
  'git.commitMessagePlaceholder': string;
  'git.commitFiles': string;
  'git.worktreeCleanNoChanges': string;
  'git.noCommitHistory': string;
  'git.confirmRollback': string;
  'git.useHardRollback': string;
  'git.rollbackSuccess': string;
  'git.rollbackFailed': string;
  'git.rollbackToThisCommit': string;
  'git.rollback': string;
  'git.confirmRevert': string;
  'git.revertSuccess': string;
  'git.revertFailed': string;
  'git.revertThisCommit': string;
  'git.revert': string;
  'git.newBranchNamePlaceholder': string;
  'git.createBranch': string;
  'git.noBranches': string;
  'git.current': string;

  // Scripts Panel
  'scripts.mode': string;
  'scripts.simpleMode': string;
  'scripts.interceptorMode': string;
  'scripts.add': string;
  'scripts.delete': string;
  'scripts.noInterceptors': string;
  'scripts.runTests': string;
  'scripts.console': string;
  'scripts.all': string;
  'scripts.info': string;
  'scripts.warn': string;
  'scripts.error': string;
  'scripts.clear': string;
  'scripts.export': string;
  'scripts.consoleOutput': string;
  'scripts.syntaxError': string;
  'scripts.beforeRequest': string;
  'scripts.enable': string;
  'scripts.hint': string;
  'scripts.afterResponse': string;
  'scripts.emptyScript': string;
  'scripts.setTimeoutSimulated': string;
  'scripts.scriptCompleted': string;
  'scripts.executionError': string;
  'scripts.preBuild': string;
  'scripts.preSend': string;
  'scripts.postResponse': string;
  'scripts.postError': string;

  // Body Panel
  'body.none': string;
  'body.formData': string;
  'body.graphQL': string;
  'body.schemaLoadSuccess': string;
  'body.schemaLoadFailed': string;
  'body.schemaCleared': string;
  'body.jsonFormatError': string;
  'body.format': string;
  'body.autoGenerate': string;
  'body.generate': string;
  'body.dragFileHere': string;
  'body.fileTooLarge': string;
  'body.selected': string;
  'body.clickToSelect': string;
  'body.removeFile': string;
  'body.file': string;
  'body.text': string;
  'body.description': string;
  'body.addDescription': string;
  'body.fieldDescription': string;
  'body.addField': string;
  'body.dropToAdd': string;
  'body.bulkImport': string;
  'body.pasteJsonOrQuery': string;
  'body.import': string;
  'body.loading': string;
  'body.loadSchema': string;
  'body.clear': string;
  'body.schemaLoaded': string;
  'body.hideDocs': string;
  'body.viewDocs': string;
  'body.selectBinaryFile': string;
  'body.fileExceedLimit': string;
  'body.noRequestBody': string;
  'body.noneLabel': string;
  'body.maxAllowed': string;
  'body.types': string;
  'body.graphQLSchemaUrl': string;

  // Auth Panel
  'auth.fillCompleteOAuth': string;
  'auth.cannotOpenBrowser': string;
  'auth.enterAuthCode': string;
  'auth.tokenExchangeFailed': string;
  'auth.configureRefreshToken': string;
  'auth.refreshFailed': string;
  'auth.fillCompleteToken': string;
  'auth.clientCredentialsFailed': string;
  'auth.none': string;
  'auth.bearer': string;
  'auth.basic': string;
  'auth.apiKey': string;
  'auth.oauth2': string;
  'auth.aws': string;
  'auth.custom': string;
  'auth.customPrefix': string;
  'auth.jwt': string;
  'auth.bearerJWT': string;
  'auth.token': string;
  'auth.username': string;
  'auth.password': string;
  'auth.tokenTypeDefault': string;
  'auth.scopeSpaceSeparated': string;
  'auth.keyNamePlaceholder': string;
  'auth.authorized': string;
  'auth.characters': string;
  'auth.refreshTokenAvailable': string;
  'auth.refresh': string;
  'auth.copy': string;
  'auth.clear': string;
  'auth.authorizing': string;
  'auth.completeAuthInBrowser': string;
  'auth.pasteAuthCode': string;
  'auth.exchangeToken': string;
  'auth.cancel': string;
  'auth.retry': string;
  'auth.accessTokenManual': string;
  'auth.refreshTokenOptional': string;
  'auth.getToken': string;
  'auth.markAsAuthorized': string;
  'auth.awsSignatureAuth': string;
  'auth.awsSignatureDescription': string;
  'auth.serviceName': string;
  'auth.serviceNamePlaceholder': string;
  'auth.sessionTokenOptional': string;
  'auth.sessionTokenPlaceholder': string;
  'auth.signatureProcess': string;

  // History Panel
  'history.title': string;
  'history.deleteHistory': string;
  'history.deleteSelected': string;
  'history.clearHistory': string;
  'history.confirmClear': string;
  'history.confirmDelete': string;
  'history.loading': string;
  'history.refresh': string;
  'history.favoritesOnly': string;
  'history.showAll': string;
  'history.delete': string;
  'history.clear': string;
  'history.searchPlaceholder': string;
  'history.selectAll': string;
  'history.sort': string;
  'history.time': string;
  'history.status': string;
  'history.duration': string;
  'history.noMatch': string;
  'history.tryOtherKeywords': string;
  'history.noHistory': string;
  'history.autoSave': string;
  'history.success': string;
  'history.failed': string;
  'history.open': string;
  'history.copyStatus': string;
  'history.unfavorite': string;
  'history.favorite': string;
  'history.deleteOthers': string;
  'history.confirmDeleteOthers': string;

  // Import Config
  'import.noConfig': string;
  'import.createConfigToEnable': string;
  'import.everyMinutes': string;
  'import.manualSync': string;
  'import.lastSync': string;
  'import.syncing': string;
  'import.sync': string;
  'import.delete': string;
  'import.title': string;
  'import.apiConfig': string;
  'import.collectionImport': string;
  'import.fullBackup': string;
  'import.savedConfigs': string;
  'import.newConfig': string;
  'import.back': string;
  'import.configName': string;
  'import.syncInterval': string;
  'import.cancel': string;
  'import.save': string;
  'import.configNameUrlRequired': string;
  'import.syncedFrom': string;
  'import.deleteConfigFailed': string;
  'import.create': string;
  'import.hourly': string;
  'import.everyXHours': string;
  'import.daily': string;

  // Backup
  'backup.exportAll': string;
  'backup.exportDescription': string;
  'backup.importAll': string;
  'backup.importDescription': string;
  'backup.replace': string;
  'backup.merge': string;
  'backup.exportSuccess': string;
  'backup.exportFailed': string;
  'backup.importSuccess': string;
  'backup.importFailed': string;
  'backup.importFromClipboard': string;
  'backup.importFromFile': string;
  'backup.exporting': string;
  'backup.fileSizeExceeded': string;
  'backup.skippedFiles': string;
  'backup.selectFile': string;
  'backup.fullBackup': string;
  'backup.fullBackupDescription': string;

  // Response Panel
  'response.connect': string;
  'response.transfer': string;
  'response.process': string;
  'response.total': string;
  'response.clickToViewRequest': string;
  'response.label': string;
  'response.unfavorite': string;
  'response.favorite': string;
  'response.sendRequest': string;
  'response.ctrlEnter': string;
  'response.requestFailed': string;
  'response.timeline': string;
  'response.compare': string;
  'response.preview': string;
  'response.raw': string;
  'response.desensitize': string;
  'response.desensitizeData': string;
  'response.searchResponse': string;
  'response.copyPath': string;
  'response.copyValue': string;
  'response.copyBody': string;
  'response.copyAsJson': string;
  'response.copyAsScriptVar': string;
  'response.cannotGetValue': string;
  'response.copyFailed': string;
  'response.selectHistoryResponse': string;
  'response.compareResult': string;
  'response.current': string;
  'response.history': string;
  'response.diff': string;
  'response.noHistoryToCompare': string;

  // Navigation
  'nav.apiList': string;
  'nav.flowCanvas': string;
  'nav.requestBuilder': string;
  'nav.environment': string;
  'nav.mockConfig': string;
  'nav.aiChat': string;
  'nav.settings': string;
  'nav.gitVersion': string;

  // AI Chat
  'chat.apiCall': string;
  'chat.search': string;
  'chat.listApis': string;
  'chat.agent': string;
  'chat.placeholder': string;
  'chat.send': string;
  'chat.clear': string;
  'chat.clearConversation': string;
  'chat.pressEnter': string;
  'chat.quick': string;
  'chat.connected': string;
  'chat.howToUse': string;
  'chat.agentPowered': string;
  'chat.quickCommands': string;
  'chat.close': string;
  'chat.askMeAnything': string;
  'chat.tryListOrSearch': string;
  'chat.thinking': string;
  'chat.aiChatPoweredByClaude': string;
  'chat.cmdSearch': string;
  'chat.cmdList': string;
  'chat.cmdRun': string;
  'chat.cmdHelp': string;

  // Node Types
  'node.apiCall': string;
  'node.auth': string;
  'node.condition': string;
  'node.loop': string;
  'node.assert': string;
  'node.transform': string;
  'node.delay': string;
  'node.log': string;
  'node.script': string;
  'node.useSimpleMode': string;
  'node.supportedOperators': string;
  'node.presetDurations': string;
  'node.availableApis': string;
  'node.confirmDelete': string;
}

const translations: Record<Language, TranslationKey> = {
  'zh-CN': {
    // App Settings
    'settings.title': '设置',
    'settings.general': '通用',
    'settings.appearance': '外观',
    'settings.request': '请求',
    'settings.proxy': '代理',
    'settings.ssl': 'SSL',
    'settings.capture': '抓包',
    'settings.shortcuts': '快捷键',
    'settings.save': '保存',
    'settings.privacy': '隐私',
    'settings.backup': '备份',
    'settings.exportSettings': '导出设置',
    'settings.exportSettings.desc': '将设置导出到文件（不包含敏感数据）',
    'settings.importSettings': '导入设置',
    'settings.importSettings.desc': '从文件导入设置',
    'settings.importWarning': '导入将覆盖当前设置，部分敏感数据（如密码）不会被导入',
    'settings.exported': '导出成功',
    'settings.imported': '导入成功',
    'settings.importFailed': '导入失败',
    'settings.region': '地区',
    'settings.font': '字体',
    'settings.seconds': '秒',
    'settings.minutes': '分钟',
    'settings.oneMinute': '1分钟',
    'settings.twoMinutes': '2分钟',
    'settings.fiveMinutes': '5分钟',
    'settings.twoSpaces': '2空格',
    'settings.fourSpaces': '4空格',
    'settings.timeout': '超时',
    'settings.redirect': '重定向',
    'settings.clientCertificate': '客户端证书',
    'settings.certFile': '客户端证书文件 (.pem, .crt)',
    'settings.keyFile': '私钥文件 (.pem, .key)',
    'settings.caCertFile': 'CA 证书文件 (.pem, .crt, .ca-bundle)',
    'settings.timeout5s': '5秒',
    'settings.timeout10s': '10秒',
    'settings.timeout15s': '15秒',
    'settings.timeout30s': '30秒',
    'settings.timeout60s': '60秒',
    'settings.timeout120s': '120秒',

    // Audit Log
    'audit.title': '审计日志',
    'audit.operationAuditLog': '操作审计日志',
    'audit.recordCount': '共 {count} 条记录',
    'audit.export': '导出',
    'audit.clear': '清除',
    'audit.categoryFilter': '分类筛选',
    'audit.all': '全部',
    'audit.searchPlaceholder': '搜索操作描述...',
    'audit.noAuditLogs': '暂无审计日志',
    'audit.exportTitle': '导出审计日志',
    'audit.exportMessage': '将导出 {count} 条审计日志记录为 JSON 格式',
    'audit.cancel': '取消',
    'audit.confirmClear': '清除',
    'audit.clearConfirmTitle': '清除审计日志',
    'audit.clearConfirmMessage': '确定要清除所有审计日志吗？此操作不可恢复。',
    'audit.cleared': '审计日志已清除',

    // App
    'app.loading': '加载中...',
    'app.theme.dark': '深色',
    'app.theme.light': '浅色',
    'app.theme.blue': '夕照',
    'app.theme.notion': '暖白',
    'app.theme.vermont': '松木',
    'app.expand': '展开',
    'app.collapse': '折叠',

    // Diff Viewer
    'diff.loading': '加载差异中...',
    'diff.noDiff': '暂无差异',
    'diff.linesAdded': '+{count} 行添加',
    'diff.linesRemoved': '-{count} 行删除',
    'diff.selectCommitA': '选择提交 A',
    'diff.selectCommitB': '选择提交 B (可选，默认 HEAD)',
    'diff.compare': '比较',

    // Mock Server
    'mock.title': 'Mock 服务器',
    'mock.loadStatusFailed': '加载 Mock 服务器状态失败',
    'mock.loadRulesFailed': '加载 Mock 规则失败',
    'mock.portRangeError': '端口必须在 1024-65535 之间',
    'mock.startedOnPort': 'Mock Server 已启动于端口 {port}',
    'mock.startFailed': '启动失败: {error}',
    'mock.stopped': 'Mock Server 已停止',
    'mock.stopFailed': '停止失败: {error}',
    'mock.newRule': '新规则',
    'mock.ruleAdded': '规则已添加',
    'mock.ruleAddFailed': '添加失败: {error}',
    'mock.ruleDeleted': '规则已删除',
    'mock.ruleDeleteFailed': '删除失败: {error}',
    'mock.ruleUpdateFailed': '更新失败: {error}',
    'mock.requestLogCleared': '请求日志已清除',
    'mock.requestLogClearFailed': '清除失败: {error}',
    'mock.serverDescription': '启动本地 HTTP 服务器拦截请求并返回 Mock 响应',
    'mock.runningOnPort': '运行中 :{port}',
    'mock.port': '端口:',
    'mock.stopping': '停止中...',
    'mock.stop': '停止',
    'mock.starting': '启动中...',
    'mock.start': '启动',
    'mock.rules': '规则:',
    'mock.requests': '请求:',
    'mock.mockRules': 'Mock 规则',
    'mock.addRule': '+ 添加规则',
    'mock.addRuleHint': '启动 Mock Server 后才能添加规则',
    'mock.noRules': '暂无规则，点击"添加规则"创建',
    'mock.delete': '删除',
    'mock.allMethods': 'ALL',
    'mock.anyPath': '(任意路径)',
    'mock.requestLog': '请求日志',
    'mock.clearLog': '清除日志',
    'mock.viewLogHint': '启动 Mock Server 后才能查看请求日志',
    'mock.noRequestLog': '暂无请求日志，发送请求后将在此显示',
    'mock.usageInstructions': '使用说明',
    'mock.startServerAndNotePort': '启动 Mock Server 并记录端口号',
    'mock.useLocalhostPrefix': '在请求 URL 中使用 http://localhost:{port} 前缀',
    'mock.addMatchingRules': '添加匹配规则，设置路径模式和响应模板',
    'mock.mockServerIntercepts': '发送请求时，Mock Server 会拦截并返回配置的响应',
    'mock.portMustBe1024': '端口必须在 1024-65535 之间',

    // General
    'common.save': '保存',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.add': '添加',
    'common.enabled': '已启用',
    'common.disabled': '已禁用',
    'common.on': '开',
    'common.off': '关',
    'common.yes': '是',
    'common.no': '否',
    'common.reset': '重置',
    'common.resetAll': '重置全部',
    'common.rename': '重命名',
    'common.export': '导出',
    'common.import': '导入',
    'common.search': '搜索',
    'common.loading': '加载中...',
    'common.search.placeholder': '搜索...',
    'common.noContent': '无内容',
    'common.importToStart': '导入 API文档开始',
    'common.moveTo': '移动到...',
    'common.insert': '插入',
    'common.lock': '锁定',
    'common.unlock': '解锁',
    'common.description': '描述',
    'common.addDescription': '添加描述',

    // Code Gen
    'codegen.title': '代码生成',
    'codegen.copyCode': '复制代码',
    'codegen.codeCopied': '代码已复制到剪贴板',
    'codegen.noRequestData': '// 无请求数据',
    'common.close': '关闭',
    'common.copy': '复制',
    'common.error': '错误',
    'common.success': '成功',
    'common.true': '真',
    'common.false': '假',

    // Common Errors
    'common.error.urlRequired': '请输入 URL',
    'common.error.requestCancelled': '请求已取消',
    'common.error.sslCertReadFailed': '读取SSL证书失败',
    'common.error.mockPreviewFailed': '生成 Mock 预览失败',

    // OAuth Errors
    'oauth.error.incompleteConfig': '请填写完整的 OAuth 配置（Auth URL、Client ID、Callback URL）',
    'oauth.error.cannotOpenBrowser': '无法自动打开浏览器，请手动访问: ',
    'oauth.error.enterAuthCode': '请输入授权码并填写完整的 Token 配置',
    'oauth.error.tokenExchangeFailed': 'Token 交换失败: ',
    'oauth.error.ensureRefreshToken': '请确保配置了 Refresh Token 和完整的 Token 配置',
    'oauth.error.refreshFailed': '刷新失败: ',
    'oauth.error.incompleteTokenConfig': '请填写完整的 Token 配置（Access Token URL、Client ID、Client Secret）',
    'oauth.error.clientCredentialsFailed': 'Client Credentials 获取失败: ',

    // Script Errors
    'script.error.empty': '脚本为空',
    'script.error.executionFailed': '执行错误: ',
    'script.error.executionComplete': '脚本执行完成',
    'script.warn.preBuild': 'preBuild 警告: ',
    'script.warn.preSend': 'preSend 警告: ',
    'script.warn.postResponse': 'postResponse 警告: ',

    // Field Editor
    'field.title': '字段设置',
    'field.field': '字段',
    'field.genType': '生成类型',
    'field.suffix': '后缀',
    'field.suffixNone': '无',
    'field.suffixSeq': '_001 (序号)',
    'field.suffixCustom': '自定义',
    'field.customSuffix': '自定义后缀',
    'field.preview': '预览',
    'field.apply': '应用',
    'field.cancel': '取消',
    'field.loading': '加载中...',
    'field.empty': '(空)',

    // GraphQL Schema Docs
    'graphql.schemaDocs': 'Schema 文档',
    'graphql.typesCount': '{count} 类型',
    'graphql.searchTypes': '搜索类型、字段...',
    'graphql.all': '全部',
    'graphql.object': '对象',
    'graphql.input': '输入',
    'graphql.enum': '枚举',
    'graphql.interface': '接口',
    'graphql.union': '联合',
    'graphql.noMatch': '未找到匹配的类型',

    // Toast Messages
    'toast.collectionRenamed': '集合已重命名',
    'toast.requestRenamed': '请求已重命名',
    'toast.collectionDeleted': '集合已删除',
    'toast.requestDeleted': '请求已删除',
    'toast.collectionExported': '已导出集合',
    'toast.movedTo': '已移动到',

    // Appearance
    'appearance.theme': '颜色主题',
    'appearance.theme.dark': '深色',
    'appearance.theme.light': '浅色',
    'appearance.theme.system': '跟随系统',
    'appearance.theme.blue': '夕照',
    'appearance.theme.notion': '暖白',
    'appearance.theme.vermont': '松木',
    'appearance.fontSize': '字体大小',
    'appearance.tabSize': '缩进宽度',
    'appearance.lineHeight': '行间距',
    'appearance.fontSize.compact': '紧凑',
    'appearance.fontSize.normal': '正常',
    'appearance.fontSize.relaxed': '宽松',
    'appearance.theme.description': '选择界面配色方案',
    'appearance.fontSize.description': '调整界面文字大小',
    'appearance.tabSize.description': '代码编辑器的缩进大小',
    'appearance.lineHeight.description': '代码编辑器的行间距',

    // General Settings
    'general.autoSave': '自动保存',
    'general.autoSave.description': '定期自动保存当前工作状态',
    'general.autoSaveInterval': '保存间隔',
    'general.sensitiveMask': '敏感数据脱敏',
    'general.sensitiveMask.description': '在日志和响应中隐藏敏感信息',
    'general.language': '语言 / Language',
    'general.language.description': '选择界面显示语言',
    'general.languageChinese': '中文',
    'general.languageEnglish': 'English',
    'general.seconds': '秒',
    'general.minute': '1分钟',
    'general.minutes': '分钟',

    // Request Settings
    'request.timeout': '请求超时',
    'request.timeout.description': 'HTTP请求的最大等待时间',
    'request.followRedirects': '跟随重定向',
    'request.followRedirects.description': '自动跟随3xx响应跳转',

    // Proxy Settings
    'proxy.enable': '启用代理',
    'proxy.enable.description': '通过代理服务器发送请求',
    'proxy.protocol': '协议',
    'proxy.host': '主机地址',
    'proxy.port': '端口',
    'proxy.username': '用户名 (可选)',
    'proxy.password': '密码 (可选)',
    'proxy.url': '代理地址',

    // SSL Settings
    'ssl.enableMtls': '启用 mTLS',
    'ssl.enableMtls.description': '使用客户端证书进行双向认证',
    'ssl.clientCert': '客户端证书',
    'ssl.privateKey': '私钥文件',
    'ssl.caCert': 'CA 证书',

    // Capture Settings
    'capture.enable': '启用抓包',
    'capture.enable.description': '捕获 HTTP 请求和响应',
    'capture.allowedDomains': '允许抓取的域名',
    'capture.allowedDomains.description': '空表示允许所有域名。支持通配符 *.example.com',
    'capture.excludePatterns': '排除规则（正则表达式）',
    'capture.excludePatterns.description': '匹配这些模式的请求不会被抓取',
    'capture.addDomain': '添加',
    'capture.addPattern': '添加',
    'capture.noRestrictions': '无限制',
    'capture.placeholder.domain': 'localhost, *.example.com',
    'capture.placeholder.pattern': '\\.js(\\?.*)?$',
    'capture.capturedRequests': '已捕获的请求',
    'capture.clickToExpand': '点击展开',
    'capture.clear': '清空',
    'capture.collapse': '折叠',
    'capture.moreRequests': '{count} 更多...',
    'capture.noCapturedRequests': '暂无已捕获的请求',
    'capture.connected': '已连接',
    'capture.disconnected': '已断开',

    // Shortcuts
    'shortcuts.title': '键盘快捷键',
    'shortcuts.description': '配置全局键盘快捷键',

    // Workspace
    'workspace.apis': 'APIs',
    'workspace.collections': '集合',
    'workspace.capture': '抓包',
    'workspace.noEndpoints': '无端点',

    // Request Builder
    'request.url': 'URL',
    'request.send': '发送',
    'request.method': '方法',
    'request.params': '参数',
    'request.headers': '请求头',
    'request.body': '请求体',
    'request.auth': '认证',
    'request.response': '响应',
    'request.urlPlaceholder': '输入请求 URL...',
    'request.detail': '请求详情',
    'request.preview': '发送前预览',
    'request.rawUrl': '原始 URL:',
    'request.binaryResponse': '📦 二进制响应',
    'request.xmlResponse': '</> XML 响应',
    'request.textResponse': '文本响应 ({type})',
    'request.noSchema': '无 schema',
    'request.updateRequest': '更新请求',
    'request.saveRequest': '保存请求',
    'request.requestName': '请求名称',
    'request.inputRequestName': '输入请求名称',
    'request.urlNone': '(无)',
    'request.saving': '保存中...',
    'request.update': '更新',
    'request.save': '保存',

    // Scripts Completion
    'scripts.completion.environment': '环境变量',
    'scripts.completion.utils': '工具函数',
    'scripts.completion.variables': '全局变量',
    'scripts.completion.lodash': 'Lodash 工具',
    'scripts.completion.console': '控制台输出',
    'scripts.completion.test': '定义测试用例',
    'scripts.completion.expect': '断言',
    'scripts.completion.request': '请求对象',
    'scripts.completion.response': '响应对象',
    'scripts.completion.setTimeout': '延时执行',
    'scripts.completion.info': '请求信息',
    'scripts.completion.getEnv': '获取环境变量',
    'scripts.completion.setEnv': '设置环境变量',
    'scripts.completion.toObject': '转换为对象',
    'scripts.completion.sha256': 'SHA-256 哈希',
    'scripts.completion.md5': 'MD5 哈希',
    'scripts.completion.randomUuid': '生成随机 UUID',
    'scripts.completion.urlEncode': 'URL 编码',
    'scripts.completion.urlDecode': 'URL 解码',
    'scripts.completion.base64Encode': 'Base64 编码',
    'scripts.completion.base64Decode': 'Base64 解码',
    'scripts.completion.getVar': '获取变量',
    'scripts.completion.setVar': '设置变量',
    'scripts.completion.hasVar': '检查变量存在',
    'scripts.completion.getNested': '获取嵌套值',
    'scripts.completion.setNested': '设置嵌套值',
    'scripts.completion.hasProp': '检查属性存在',
    'scripts.completion.pick': '选择属性',
    'scripts.completion.omit': '排除属性',
    'scripts.completion.merge': '合并对象',
    'scripts.completion.cloneDeep': '深拷贝',
    'scripts.completion.map': '映射',
    'scripts.completion.filter': '过滤',
    'scripts.completion.find': '查找',
    'scripts.completion.log': '输出日志',
    'scripts.completion.warn': '输出警告',
    'scripts.completion.error': '输出错误',
    'scripts.completion.url': '请求 URL',
    'scripts.completion.method': '请求方法',
    'scripts.completion.deleteEnv': '删除环境变量',
    'scripts.completion.deleteVar': '删除变量',
    'scripts.completion.params': '查询参数',
    'scripts.completion.headers': '请求头',
    'scripts.completion.value': '值',
    'scripts.completion.bodyJson': '请求体 (JSON)',
    'scripts.completion.body': '请求体',
    'scripts.completion.resBody': '响应体',
    'scripts.completion.statusCode': '响应状态码',
    'scripts.completion.statusText': '响应状态文本',
    'scripts.completion.resHeaders': '响应头',
    'scripts.completion.resTime': '响应时间(ms)',
    'scripts.completion.parseJson': '解析 JSON',
    'scripts.completion.getText': '获取文本',
    'scripts.completion.resBodyFields': '响应体字段',
    'scripts.completion.requestId': '请求 ID',
    'scripts.completion.iteration': '当前迭代',
    'scripts.completion.iterationCount': '迭代总数',

    // Schema Tree Editor
    'schema.rootNode': '根节点',
    'schema.fieldName': '字段名',
    'schema.description': '描述',
    'schema.value': '值',
    'schema.enabled': '启用',
    'schema.required': '必填',
    'schema.addChild': '添加子字段',
    'schema.delete': '删除',
    'schema.sample': '示例',

    // Test Data Generator
    'generator.sequence': '序列递增',
    'generator.random': '随机字符串',
    'generator.date': '日期',
    'generator.uuid': 'UUID',
    'generator.nullify': '清空值',
    'generator.prefix': '前缀',
    'generator.optionalPrefix': '前缀(可选)',
    'generator.preview': '预览: {preview}',
    'generator.fillEmptyOnly': '仅填充空值',
    'generator.apply': '应用',
    'generator.close': '关闭',

    // Response
    'response.status': '状态',
    'response.time': '耗时',
    'response.size': '大小',
    'response.noResponse': '暂无响应',

    // Collection Panel
    'collection.operations': '集合操作',
    'collection.export': '导出',
    'collection.duplicate': '复制',
    'collection.exportCollection': '导出集合',
    'collection.copyPostmanJson': '复制 Postman JSON',
    'collection.copyOpenApiJson': '复制 OpenAPI JSON',
    'collection.copyHarJson': '复制 HAR JSON',
    'collection.importFromFile': '从文件导入',
    'collection.importFromClipboard': '从剪贴板导入',
    'collection.selectJsonFile': '选择 JSON 文件',
    'collection.pasteJson': '粘贴 Postman Collection JSON...',
    'collection.copiedToClipboard': '已复制到剪贴板',
    'collection.importSuccess': '导入成功',
    'collection.importFailed': '导入失败',
    'collection.checkJsonFormat': '导入失败，请检查 JSON 格式',
    'collection.import': '导入',

    // Auth Items Form
    'auth.itemsForm': '认证与请求头',
    'auth.addHeader': '添加',
    'auth.addCookie': '添加',
    'auth.addQuery': '添加',
    'auth.addPath': '添加',
    'auth.headerName': 'Header 名称',
    'auth.headerValue': 'Header 值',
    'auth.cookieString': 'Cookie 字符串',
    'auth.paramName': '参数名',
    'auth.paramValue': '参数值',
    'auth.pathPlaceholder': '{placeholder}',
    'auth.pathReplaceValue': '替换值',
    'auth.pathReplaceDescription': '替换 URL 路径中的 {placeholder} 为指定值',
    'auth.pathReplace': 'Path 替换',

    // List Mode
    'list.searchPlaceholder': '搜索...',
    'list.import': '导入',
    'list.loading': '加载中...',
    'list.noApis': '无 API',
    'list.filterEndpoints': '过滤端点',
    'list.send': '发送',
    'list.noMatchingEndpoints': '无匹配端点',
    'list.selectApiOnLeft': '选择左侧 API',
    'list.semanticSearchMatch': '语义搜索匹配或文本搜索',

    // Env Panel
    'env.addVariable': '添加变量',
    'env.importExport': '导入/导出',
    'env.export': '导出',
    'env.import': '导入',
    'env.importFailed': '导入失败',
    'env.exportEnvConfig': '导出环境配置为 JSON',
    'env.importEnvConfig': '从 JSON 文件导入环境配置',

    // Collection
    'collection.new': '新建集合',
    'collection.deleteConfirm': '确定要删除此集合吗？',
    'collection.title': '集合',
    'collection.savedRequests': '已保存请求',
    'collection.dragToSort': '拖拽排序',
    'collection.newCollection': '新建集合',
    'collection.collectionName': '集合名称',
    'collection.cancel': '取消',
    'collection.create': '创建',
    'collection.exportAll': '导出所有集合',
    'collection.importCollection': '导入集合',
    'collection.duplicateCollection': '复制集合',
    'collection.deleteCollection': '删除集合',
    'collection.copyCollection': '复制集合',

    // Error Boundary
    'error.title': '发生错误',
    'error.message': '应用程序遇到了一个错误。请尝试刷新页面或返回首页。',
    'error.details': '错误详情',
    'error.refresh': '刷新页面',
    'error.recover': '尝试恢复',

    // Environment Config
    'env.deleteConfirm': '确定要删除环境 ',
    'env.importPlaceholder': '粘贴环境 JSON 数据...',
    'env.importJson': '导入环境 JSON',
    'env.cancel': '取消',
    'env.loading': '加载中...',
    'env.newEnv': '新建环境',
    'env.deleteEnv': '删除环境',
    'env.copyEnv': '复制环境',
    'env.exportEnv': '导出环境',
    'env.importEnv': '导入环境',
    'env.moveUp': '上移',
    'env.moveDown': '下移',
    'env.envName': '环境名称',
    'env.groupName': '分组名称',
    'env.newGroup': '新建分组',
    'env.rename': '重命名',
    'env.delete': '删除',
    'env.variables': '个变量',
    'env.group': '分组',
    'env.selectGroup': '请选择一个分组',
    'env.environment': '环境',
    'env.environmentVariables': '环境变量',

    // Saved Request
    'savedRequest.red': '红色',
    'savedRequest.orange': '橙色',
    'savedRequest.yellow': '黄色',
    'savedRequest.green': '绿色',
    'savedRequest.cyan': '青色',
    'savedRequest.blue': '蓝色',
    'savedRequest.purple': '紫色',
    'savedRequest.pink': '粉色',
    'savedRequest.none': '无',
    'savedRequest.color': '颜色: {color}',
    'savedRequest.setColor': '设为颜色',
    'savedRequest.editTags': '编辑标签',
    'savedRequest.clearAllTags': '清除所有标签',
    'savedRequest.moveTo': '移动到...',
    'savedRequest.enterTagPlaceholder': '输入标签后回车',
    'savedRequest.moveToCollection': '移动到集合',

    'env.envNamePlaceholder': '环境名称',
    'env.groupNamePlaceholder': '分组名称',
    'env.pleaseInputJson': '请输入 JSON 数据',
    'env.pleaseSelectGroup': '请选择一个分组',
    'env.variablesLabel': '变量:',
    'env.showAll': '👁 显示全部',
    'env.hideAll': '🙈 隐藏全部',
    'env.inherited': '继承',
    'env.toggleSensitive': '显示/隐藏敏感值',
    'env.duplicateVarName': '重复的变量名',
    'env.noVariables': '暂无变量，点击上方"添加变量"开始',
    'env.emptyKeyName': '变量名称不能为空',
    'env.keyExists': '变量名称已存在',
    'env.invalidKeyName': '变量名称只能包含字母、数字、下划线和连字符，且不能以数字开头',
    'env.addVariableTitle': '添加变量',
    'env.variableName': '变量名称',
    'env.loadFailed': '加载环境配置失败',
    'env.envAlreadyExists': '环境已存在',
    'env.createEnvFailed': '创建环境失败',
    'env.mustKeepOneEnv': '至少需要保留一个环境',
    'env.deleteEnvFailed': '删除环境失败',
    'env.envNameAlreadyExists': '环境名称已存在',
    'env.renameEnvFailed': '重命名环境失败',
    'env.envNotFound': '环境不存在',
    'env.copyEnvFailed': '复制环境失败',
    'env.sortEnvFailed': '排序环境失败',
    'env.groupAlreadyExists': '分组已存在',
    'env.addGroupFailed': '添加分组失败',
    'env.mustKeepOneGroup': '至少需要保留一个分组',
    'env.deleteGroupFailed': '删除分组失败',
    'env.groupNameAlreadyExists': '分组名称已存在',
    'env.renameGroupFailed': '重命名分组失败',
    'env.saveVarFailed': '保存变量失败',
    'env.toggleVarFailed': '切换变量状态失败',
    'env.deleteVarFailed': '删除变量失败',

    // Headers Panel
    'headers.savePreset': '保存头部预设',
    'headers.presetName': '预设名称',
    'headers.save': '保存',
    'headers.managePresets': '管理自定义预设',
    'headers.noCustomPresets': '暂无自定义预设',
    'headers.headersCount': '个头部',
    'headers.delete': '删除',
    'headers.addPreset': '添加预设',
    'headers.custom': '自定义',
    'headers.manage': '管理预设',
    'headers.generate': '生成',
    'headers.reset': '重置',
    'headers.unlock': '解锁',
    'headers.lock': '锁定',
    'headers.commonHeaders': '常用 Header',
    'headers.description': '描述',
    'headers.addDescription': '添加描述',
    'headers.addHeader': '添加头部',
    'headers.saveAsPreset': '保存为自定义预设',
    'headers.smartGenerate': '根据头部名称智能生成值',

    // Params Panel
    'params.title': '查询参数',
    'params.autoEncode': '自动 URL 编码',
    'params.encode': '编码',
    'params.generate': '生成',
    'params.reset': '重置',
    'params.unlock': '解锁',
    'params.lock': '锁定',
    'params.historyValues': '历史值',
    'params.string': '字符串',
    'params.number': '数字',
    'params.boolean': '布尔',
    'params.array': '数组',
    'params.editField': '编辑此字段',
    'params.description': '描述',
    'params.addDescription': '添加描述',
    'params.copy': '复制 (Ctrl+C)',
    'params.paste': '粘贴 (Ctrl+V)',
    'params.addParam': '添加参数',
    'params.invalidNumber': '必须是有效数字',
    'params.invalidBoolean': '必须是 true/false',
    'params.invalidArray': '数组格式：value1,value2',
    'params.arrayFormat': '数组格式：value1,value2',
    'params.schemaType': 'Schema类型: ',
    'params.paramType': '参数类型',

    // Request Builder
    'request.close': '关闭',
    'request.closeLeft': '关闭左侧',
    'request.closeRight': '关闭右侧',
    'request.closeOthers': '关闭其它',
    'request.updated': '请求已更新',
    'request.deleted': '请求已删除',
    'request.deleteFailed': '删除失败',
    'request.savedTo': '已保存到',
    'request.saveFailed': '保存失败',
    'request.myCollection': '我的集合',
    'request.unnamedRequest': '未命名请求',
    'request.clearConfirm': '确定要清除当前请求吗？',
    'request.confirm': '确认',
    'request.cancel': '取消',
    'request.parseUrl': '解析 URL 参数',
    'request.urlHasParams': '检测到 URL 包含查询参数，是否要解析到 Params 面板？',
    'request.parse': '解析',
    'request.scripts': '脚本',
    'request.history': '历史',
    'request.requestDescription': '请求说明',
    'request.added': '已添加',
    'request.addRequestDescription': '添加请求说明...',
    'request.requestSchema': '请求 Schema',
    'request.parameterCount': '{count} 个',
    'request.paramName': '参数名',
    'request.rename': '重命名:',
    'request.noRequestParams': '暂无请求参数定义',
    'request.collapse': '收起',
    'request.edit': '编辑',
    'request.responseSchema': '响应 Schema',
    'request.responseDescription': '响应描述',
    'request.noResponseDefinition': '暂无响应定义',
    'request.binary': '二进制',
    'response.addResponse': '添加响应',
    'response.add': '添加',
    'response.noResponseDefinition': '暂无响应定义，点击上方添加',
    'response.collapse': '收起',
    'response.editSchema': '编辑 Schema',
    'response.delete': '删除',
    'response.binaryResponse': '二进制响应 ({type})',
    'response.textResponse': '文本响应',
    'response.xmlResponse': 'XML 响应',
    'response.noSchemaDefinition': '无 schema 定义',

    // URL Bar
    'url.noEnvironment': '无环境',
    'url.history': '历史记录',
    'url.preview': 'URL 预览',
    'url.highlight': '高亮',
    'url.replaceValue': '替换值',
    'url.encodePreview': '编码预览',
    'url.undefinedVariable': '未定义变量',
    'url.envVariables': '环境变量',
    'url.globalVariables': '全局变量',
    'url.send': '发送',
    'url.cancel': '取消',
    'url.saveRequest': '保存请求 (Ctrl+S)',
    'url.save': '保存',
    'url.code': '代码',
    'url.settings': '设置',
    'url.autoParseUrl': '自动解析 URL',
    'url.autoEncodeUrl': '自动编码 URL',
    'url.sslVerify': '验证 SSL',
    'url.timeout': '超时 (ms)',
    'url.noTimeout': '无超时限制',
    'url.timeoutValue': '超时时间: ',
    'url.retryOnFailure': '失败重试',
    'url.maxRetries': '最大重试',
    'url.retryDelay': '重试延迟 (ms)',
    'url.horizontal': '水平',
    'url.vertical': '垂直',
    'url.requestFocus': '请求优先',
    'url.responseFocus': '响应优先',

    // Mock Config
    'mock.title.description': '统一的数据模拟配置，支持字段生成和响应模拟',
    'mock.generate': '生成',
    'mock.mock': '模拟',
    'mock.server': 'Server',
    'mock.preview': '实时预览',
    'mock.loading': '加载中...',
    'mock.names': '个名字',
    'mock.cities': '个城市',
    'mock.builtinRules': '内置规则',
    'mock.hide': '隐藏',
    'mock.show': '显示',
    'mock.resetToDefault': '重置为默认',
    'mock.customRules': '自定义规则',
    'mock.noCustomRules': '暂无自定义规则',
    'mock.customRules.description': '规则名 → 规则类型映射，用于响应模板中 {{规则名}}',
    'mock.ruleNamePlaceholder': '规则名，如 userEmail',
    'mock.addCustomRule': '添加自定义规则',
    'mock.fieldMatchRules': '字段匹配规则',
    'mock.noFieldMatchRules': '暂无字段匹配规则',
    'mock.fieldMatchRules.description': '正则匹配字段名 → 规则类型，用于字段模拟时自动识别',
    'mock.patternPlaceholder': '正则模式，如 user_*',
    'mock.addFieldMatchRule': '添加字段匹配规则',
    'mock.languageDataPool': '语言 / 数据池',
    'mock.chinese': '中文',
    'mock.english': 'English',
    'mock.current': '当前',
    'mock.smartDetection': '智能检测',
    'mock.autoDetectType': '根据字段名自动识别类型',
    'mock.smartDetection.description': '启用后，字段名含 email → 邮箱, phone → 电话, city → 城市 等',
    'mock.sequenceGeneration': '序列生成',
    'mock.prefix': '前缀',
    'mock.startValue': '起始值',
    'mock.zeroPadding': '补零位数',
    'mock.example': '示例',
    'mock.quickGenerate': '快速生成',
    'mock.quickGenerate.description': '在 Request Builder 中，选择 body 类型为 "mock" 即可自动生成测试数据',
    'mock.quickGenerate.description2': '或在 API 详情面板点击"生成 Mock 数据"',
    'mock.responseMock': '响应模拟',
    'mock.responseMock.description': '拦截匹配的请求，返回 Mock 响应',
    'mock.templateVariableRules': '模板变量规则',
    'mock.noTemplateVariableRules': '暂无模板变量规则',
    'mock.templateVariableRules.description': '{{变量名}} → 规则类型映射',
    'mock.variableName': '变量名',
    'mock.addTemplateVariableRule': '添加模板变量规则',
    'mock.responseRules': '响应规则',
    'mock.noResponseRules': '暂无响应规则，点击"新建规则"创建',
    'mock.disabled': '已禁用',
    'mock.edit': '编辑',
    'mock.ruleNameLabel': '规则名称',
    'mock.ruleNamePlaceholder2': '如: 用户列表',
    'mock.requestMethod': '请求方法',
    'mock.pathMatch': '路径匹配 (正则)',
    'mock.pathMatchPlaceholder': '如: /api/users 或留空匹配任意',
    'mock.statusCode': '状态码',
    'mock.delay': '延迟 (ms)',
    'mock.responseTemplate': '响应模板 (JSON)',
    'mock.responseTemplate.description': '使用 {{variable}} 占位符，可用规则类型如 {{email}}, {{name}}',
    'mock.editRule': '编辑规则',
    'mock.deleteRule': '删除规则',
    'mock.confirmDeleteRule': '确定删除此规则？',
    'mock.add': '添加',

    // Flow Canvas
    'flow.stepModeOn': '步进模式: 开',
    'flow.stepModeOff': '步进模式: 关',
    'flow.stepMode': '步进模式',
    'flow.stepExecute': '步进执行下一个节点',
    'flow.continueRun': '继续运行',
    'flow.run': '运行',
    'flow.pause': '暂停',
    'flow.stop': '停止',
    'flow.reset': '重置',
    'flow.maxParallelNodes': '最大并行节点数',
    'flow.unlimited': '无限制',
    'flow.log': '日志',
    'flow.noLog': '暂无日志',
    'flow.result': '结果',
    'flow.noResult': '暂无执行结果',
    'flow.undefinedVariables': '未定义的变量',
    'flow.error.circularDependency': '检测到循环依赖',
    'flow.configureNode': '配置',
    'flow.configureNodes': '配置',
    'flow.addChildNode': '添加子节点',
    'flow.copyNode': '复制节点',
    'flow.copyNodes': '复制节点',
    'flow.saveAsSubflow': '保存为子流程',
    'flow.saveNodesAsSubflow': '保存为子流程',
    'flow.runNode': '运行当前节点',
    'flow.runNodes': '运行节点',
    'flow.runCurrentNode': '运行当前节点',
    'flow.runDownstream': '运行下游',
    'flow.toggleBreakpoint': '切换断点',
    'flow.deleteNode': '删除节点',
    'flow.deleteNodes': '删除节点',
    'flow.pleaseSelectNode': '请先选择节点，再保存为子流程',
    'flow.savedNodesAsSubflow': '已保存',
    'flow.environment': '环境',
    'flow.concurrency': '并发',
    'flow.subflowLibrary': '子流程库',
    'flow.insertOrDeleteHint': '点击"插入"将子流程添加到画布，或"删除"移除',
    'flow.noSubflows': '暂无子流程',
    'flow.createSubflowHint': '在节点右键菜单中选择"保存为子流程"来创建',
    'flow.saveFlowAutoSave': '保存流程（每次更改自动保存）',
    'flow.loadExistingFlow': '加载已有流程',
    'flow.load': '加载',
    'flow.insertSubflow': '插入子流程',
    'flow.subflows': '子流程',
    'flow.savedFlows': '已保存的流程',
    'flow.noSavedFlows': '暂无已保存的流程',
    'flow.exportFlow': '导出流程',
    'flow.importFlow': '导入流程',
    'flow.loadListFailed': '加载流程列表失败',
    'flow.saveFailed': '保存流程失败',
    'flow.loadFailed': '加载流程失败',
    'flow.deleteFailed': '删除流程失败',
    'flow.importInvalidFormat': '无效的流程文件格式',
    'flow.importInvalidStructure': '无效的流程数据结构',
    'flow.importSuccess': '流程导入成功',
    'flow.importFailed': '导入流程失败',
    'flow.saveSubflowFailed': '保存子流程失败',
    'flow.instantiateSubflowFailed': '实例化子流程失败',
    'flow.exportFailed': '导出流程失败',
    'flow.exportSuccess': '流程导出成功',
    'flowauth.none': '无',
    'flowauth.custom': '自定义',
    'flowauth.inputCustomPrefix': '输入自定义前缀',
    'flowauth.username': '用户名',
    'flowauth.password': '密码',
    'flowauth.getToken': '获取 Token',
    'flowauth.copy': '复制',
    'flow.scope': '作用域',
    'flow.nodeOutput': '节点输出',
    'flow.envVariable': '环境变量',
    'flow.globalVariable': '全局变量',
    'flow.workflowVariable': '工作流变量',
    'flow.executionInfo': '执行信息',
    'flow.collapse': '折叠',
    'flow.executionOrder': '执行顺序',
    'flow.logs': '日志',
    'flow.clear': '清空',
    'flow.results': '结果',
    'flow.success': '成功',
    'flow.failure': '失败',
    'flow.resultCount': '个结果',
    'flow.noResults': '暂无结果',
    'flow.variableWatch': '变量监视',
    'flow.addVariable': '+ 添加',
    'flow.noVariables': '暂无变量',
    'flow.useVariableSyntax': '使用 {"{{variableName}}"} 语法引用变量',
    'flow.clickToEdit': '点击编辑',
    'flow.empty': '(空)',
    'flow.variableSyntax': '变量引用语法:',
    'flow.globalVar': '全局变量:',
    'flow.envVar': '环境变量:',
    'flow.workflowVar': '工作流变量:',
    'flow.nodeOutputVar': '节点输出:',
    'flow.syntaxError': '语法错误:',
    'flow.running': '运行中...',
    'flow.runTest': '运行测试',
    'flow.availableInputs': '可用: inputs, setOutput(key, value), console.log()',
    'flow.console': '控制台',
    'flow.all': '全部',
    'flow.info': '信息',
    'flow.warn': '警告',
    'flow.error': '错误',
    'flow.clearLogs': '清空',
    'flow.consoleOutputHint': '控制台输出将在脚本执行后显示',
    'flow.executionFailed': '工作流执行失败',
    'flow.executionStopped': '执行已停止',
    'flow.pleaseStartStepMode': '请先启动步进执行模式',
    'flow.pleaseEnableStepMode': '请先开启步进模式',
    'flow.steppingCancelled': '步进执行已取消',
    'flow.breakpointEnabled': '已启用断点',

    // Git Panel
    'git.title': 'Git 版本控制',
    'git.pleaseInputCommitMessage': '请输入提交信息',
    'git.confirmSwitchBranch': '确定切换到分支 ',
    'git.confirmCreateBranch': '确定创建分支 ',
    'git.worktreeClean': '工作区干净',
    'git.hasUncommittedChanges': '有未提交的更改',
    'git.refresh': '刷新',
    'git.tab.status': '状态',
    'git.tab.history': '历史',
    'git.tab.branches': '分支',
    'git.tab.diff': '差异',
    'git.loading': '加载中...',
    'git.noStatusData': '暂无状态数据',
    'git.staged': '已暂存',
    'git.unstaged': '未暂存',
    'git.untracked': '未跟踪',
    'git.stageSelectedFiles': '暂存已选文件',
    'git.commitMessagePlaceholder': '输入提交信息...',
    'git.commitFiles': '提交',
    'git.worktreeCleanNoChanges': '工作区干净，没有更改',
    'git.noCommitHistory': '暂无提交记录',
    'git.confirmRollback': '确定要回滚到提交 ',
    'git.useHardRollback': '使用硬回滚（会丢失之后的所有提交）？\n\n取消 = 软回滚（保留更改）',
    'git.rollbackSuccess': '回滚成功',
    'git.rollbackFailed': '回滚失败',
    'git.rollbackToThisCommit': '回滚到此提交',
    'git.rollback': '回滚',
    'git.confirmRevert': '确定要还原提交 ',
    'git.revertSuccess': '还原成功',
    'git.revertFailed': '还原失败',
    'git.revertThisCommit': '还原此提交（创建新提交撤销更改）',
    'git.revert': '还原',
    'git.newBranchNamePlaceholder': '新分支名称...',
    'git.createBranch': '创建分支',
    'git.noBranches': '暂无分支',
    'git.current': '当前',

    // Scripts Panel
    'scripts.mode': '模式',
    'scripts.simpleMode': '简洁模式',
    'scripts.interceptorMode': '拦截器模式',
    'scripts.add': '添加',
    'scripts.delete': '删除',
    'scripts.noInterceptors': '暂无拦截器',
    'scripts.runTests': '运行测试',
    'scripts.console': '控制台',
    'scripts.all': '全部',
    'scripts.info': '信息',
    'scripts.warn': '警告',
    'scripts.error': '错误',
    'scripts.clear': '清空',
    'scripts.export': '导出',
    'scripts.consoleOutput': '控制台输出将在脚本执行后显示',
    'scripts.syntaxError': '语法错误',
    'scripts.beforeRequest': '请求发送前执行',
    'scripts.enable': '启用',
    'scripts.hint': '提示',
    'scripts.afterResponse': '响应接收后执行',
    'scripts.emptyScript': '脚本为空',
    'scripts.setTimeoutSimulated': 'setTimeout: 模拟延迟 {delay}ms',
    'scripts.scriptCompleted': '{type} 脚本执行完成',
    'scripts.executionError': '执行错误: {message}',
    'scripts.preBuild': 'Pre-Build (构建前)',
    'scripts.preSend': 'Pre-Send (发送前)',
    'scripts.postResponse': 'Post-Response (响应后)',
    'scripts.postError': 'Post-Error (错误时)',

    // Body Panel
    'body.none': '无',
    'body.formData': 'Form Data',
    'body.graphQL': 'GraphQL',
    'body.schemaLoadSuccess': 'Schema 加载成功',
    'body.schemaLoadFailed': 'Schema 加载失败',
    'body.schemaCleared': 'Schema 已清除',
    'body.jsonFormatError': 'JSON格式错误，无法格式化',
    'body.format': '格式化',
    'body.autoGenerate': '根据字段名自动识别类型并生成',
    'body.generate': '生成',
    'body.dragFileHere': '拖拽文件到此处上传',
    'body.fileTooLarge': '文件过大',
    'body.selected': '已选',
    'body.clickToSelect': '点击选择文件',
    'body.removeFile': '移除文件',
    'body.file': '文件',
    'body.text': '文本',
    'body.description': '描述',
    'body.addDescription': '添加描述',
    'body.fieldDescription': '字段描述',
    'body.addField': '添加字段',
    'body.dropToAdd': '释放以添加文件',
    'body.bulkImport': '批量导入',
    'body.pasteJsonOrQuery': '粘贴 JSON 对象或 QueryString',
    'body.import': '导入',
    'body.loading': '加载中...',
    'body.loadSchema': '加载 Schema',
    'body.clear': '清除',
    'body.schemaLoaded': 'Schema 已加载',
    'body.hideDocs': '隐藏文档',
    'body.viewDocs': '查看文档',
    'body.selectBinaryFile': '选择二进制文件',
    'body.fileExceedLimit': '文件超过限制',
    'body.noRequestBody': '此请求没有请求体',
    'body.noneLabel': '无',
    'body.maxAllowed': '最大允许',
    'body.types': '类型',
    'body.graphQLSchemaUrl': 'GraphQL Schema URL (可选)',

    // Auth Panel
    'auth.fillCompleteOAuth': '请填写完整的 OAuth 配置（Auth URL、Client ID、Callback URL）',
    'auth.cannotOpenBrowser': '无法自动打开浏览器，请手动访问: ',
    'auth.enterAuthCode': '请输入授权码并填写完整的 Token 配置',
    'auth.tokenExchangeFailed': 'Token 交换失败: ',
    'auth.configureRefreshToken': '请确保配置了 Refresh Token 和完整的 Token 配置',
    'auth.refreshFailed': '刷新失败: ',
    'auth.fillCompleteToken': '请填写完整的 Token 配置（Access Token URL、Client ID、Client Secret）',
    'auth.clientCredentialsFailed': 'Client Credentials 获取失败: ',
    'auth.none': '无',
    'auth.bearer': 'Bearer',
    'auth.basic': 'Basic',
    'auth.apiKey': 'API Key',
    'auth.oauth2': 'OAuth 2.0',
    'auth.aws': 'AWS',
    'auth.custom': '自定义',
    'auth.customPrefix': '输入自定义前缀',
    'auth.jwt': 'JWT',
    'auth.bearerJWT': 'BearerJWT',
    'auth.token': 'Token',
    'auth.username': '用户名',
    'auth.password': '密码',
    'auth.tokenTypeDefault': 'Token Type (默认 Bearer)',
    'auth.scopeSpaceSeparated': 'Scope (空格分隔)',
    'auth.keyNamePlaceholder': 'Key Name (如: X-API-Key)',
    'auth.authorized': '已授权',
    'auth.characters': '字符',
    'auth.refreshTokenAvailable': 'Refresh Token 可用',
    'auth.refresh': '刷新',
    'auth.copy': '复制',
    'auth.clear': '清除',
    'auth.authorizing': '授权中...',
    'auth.completeAuthInBrowser': '请在打开的浏览器窗口中完成授权',
    'auth.pasteAuthCode': '或粘贴授权码',
    'auth.exchangeToken': '交换 Token',
    'auth.cancel': '取消',
    'auth.retry': '重试',
    'auth.accessTokenManual': 'Access Token (手动输入或点击获取)',
    'auth.refreshTokenOptional': 'Refresh Token (可选)',
    'auth.getToken': '获取 Token',
    'auth.markAsAuthorized': '标记已授权',
    'auth.awsSignatureAuth': 'AWS Signature 签名认证',
    'auth.awsSignatureDescription': '使用 AWS Access Key 和 Secret Key 对请求进行签名。适用于 AWS 服务（Lambda、S3、DynamoDB 等）。',
    'auth.serviceName': 'Service Name (如: lambda, s3)',
    'auth.serviceNamePlaceholder': 'Service Name (如: lambda, s3)',
    'auth.sessionTokenOptional': 'Session Token (临时凭证，可选)',
    'auth.sessionTokenPlaceholder': 'Session Token (临时凭证，可选)',
    'auth.signatureProcess': '签名过程：使用 Secret Key 生成 HMAC-SHA256 签名，附加到 Authorization header',

    // History Panel
    'history.title': '请求历史',
    'history.deleteHistory': '删除历史记录',
    'history.deleteSelected': '确定删除选中的',
    'history.clearHistory': '清空历史记录',
    'history.confirmClear': '确定清空所有',
    'history.confirmDelete': '条历史记录？',
    'history.loading': '加载中...',
    'history.refresh': '刷新',
    'history.favoritesOnly': '只看收藏',
    'history.showAll': '显示全部',
    'history.delete': '删除',
    'history.clear': '清空',
    'history.searchPlaceholder': '搜索 URL、状态码...',
    'history.selectAll': '全选',
    'history.sort': '排序:',
    'history.time': '时间',
    'history.status': '状态码',
    'history.duration': '耗时',
    'history.noMatch': '未找到匹配的历史记录',
    'history.tryOtherKeywords': '尝试其他关键词',
    'history.noHistory': '暂无请求历史',
    'history.autoSave': '发送请求后会自动保存历史记录',
    'history.success': '成功',
    'history.failed': '失败',
    'history.open': '打开',
    'history.copyStatus': '复制状态码',
    'history.unfavorite': '取消收藏',
    'history.favorite': '收藏',
    'history.deleteOthers': '删除其他',
    'history.confirmDeleteOthers': '确定删除除此条外的',

    // Import Config
    'import.noConfig': '暂无配置',
    'import.createConfigToEnable': '创建配置以启用自动同步',
    'import.everyMinutes': '每 {count} 分钟',
    'import.manualSync': '手动同步',
    'import.lastSync': '上次: {date}',
    'import.syncing': '同步中...',
    'import.sync': '同步',
    'import.delete': '删除',
    'import.title': '导入',
    'import.apiConfig': 'API 配置',
    'import.collectionImport': '集合导入导出',
    'import.savedConfigs': '已保存的配置',
    'import.newConfig': '新建配置',
    'import.back': '← 返回',
    'import.configName': '配置名称',
    'import.syncInterval': '自动同步间隔',
    'import.cancel': '取消',
    'import.save': '保存',
    'import.configNameUrlRequired': '请输入配置名称和 URL',
    'import.syncedFrom': '已从 {name} 同步 {count} 个 API',
    'import.deleteConfigFailed': '删除导入配置失败',
    'import.create': '+ 新建',
    'import.hourly': '每小时',
    'import.everyXHours': '每 {count} 小时',
    'import.daily': '每天',
    'import.fullBackup': '完整备份',

    // Backup
    'backup.exportAll': '导出所有数据',
    'backup.exportDescription': '导出集合、环境、流程和设置到单个文件（认证凭据除外）',
    'backup.importAll': '导入所有数据',
    'backup.importDescription': '从备份文件恢复所有数据',
    'backup.replace': '替换',
    'backup.merge': '合并',
    'backup.exportSuccess': '导出成功',
    'backup.exportFailed': '导出失败',
    'backup.importSuccess': '导入成功',
    'backup.importFailed': '导入失败',
    'backup.importFromClipboard': '从剪贴板导入',
    'backup.importFromFile': '从文件导入',
    'backup.exporting': '导出中...',
    'backup.fileSizeExceeded': '文件大小超过10MB限制',
    'backup.skippedFiles': '跳过 {count} 个无效文件',
    'backup.selectFile': '选择备份ZIP文件以恢复数据',
    'backup.fullBackup': '完整备份',
    'backup.fullBackupDescription': '导出或导入所有应用数据（集合、环境、流程）',

    // Response Panel
    'response.connect': '连接',
    'response.transfer': '传输',
    'response.process': '处理',
    'response.total': '总计',
    'response.clickToViewRequest': '点击查看请求详情',
    'response.label': '响应',
    'response.unfavorite': '取消收藏',
    'response.favorite': '收藏响应',
    'response.sendRequest': '发送请求后响应将显示在这里',
    'response.ctrlEnter': '按 Ctrl+Enter 快速发送',
    'response.requestFailed': '请求失败',
    'response.timeline': '时间线',
    'response.compare': '对比',
    'response.preview': '预览',
    'response.raw': '原始',
    'response.desensitize': '脱敏敏感数据',
    'response.desensitizeData': '脱敏',
    'response.searchResponse': '搜索响应内容... (支持正则)',
    'response.copyPath': '复制路径',
    'response.copyValue': '复制值',
    'response.copyBody': '复制整个Body',
    'response.copyAsJson': '复制为JSON',
    'response.copyAsScriptVar': '复制为脚本变量',
    'response.cannotGetValue': '无法获取值',
    'response.copyFailed': '复制失败',
    'response.selectHistoryResponse': '选择历史响应对比',
    'response.compareResult': '对比结果',
    'response.current': '当前',
    'response.history': '历史',
    'response.diff': '差值',
    'response.noHistoryToCompare': '暂无历史响应可对比',

    // Navigation
    'nav.apiList': 'API 列表',
    'nav.flowCanvas': 'Flow 画布',
    'nav.requestBuilder': '请求构建',
    'nav.environment': '环境配置',
    'nav.mockConfig': 'Mock 配置',
    'nav.aiChat': 'AI 对话',
    'nav.settings': '设置',
    'nav.gitVersion': 'Git 版本',

    // AI Chat
    'chat.apiCall': 'API 调用',
    'chat.search': '搜索',
    'chat.listApis': '列出 API',
    'chat.agent': 'Agent',
    'chat.placeholder': '问我任何关于你的 API 的问题...',
    'chat.send': '发送',
    'chat.clear': '清空',
    'chat.clearConversation': '清空对话',
    'chat.pressEnter': '按 Enter 发送，Shift+Enter 换行',
    'chat.quick': '快捷命令',
    'chat.connected': '已连接',
    'chat.howToUse': '如何使用 AI 对话',
    'chat.agentPowered': 'Agent 驱动',
    'chat.quickCommands': '快捷命令:',
    'chat.close': '关闭',
    'chat.askMeAnything': '有什么关于 API 的问题尽管问我',
    'chat.tryListOrSearch': '试试: "list all APIs" 或 "/search user" 或直接自然提问!',
    'chat.thinking': '思考中...',
    'chat.aiChatPoweredByClaude': 'AI Chat 由 Claude Agent 驱动，您可以自然地对话，Agent 会帮您搜索、分析和执行 API 请求。',
    'chat.cmdSearch': '搜索 API',
    'chat.cmdList': '列出所有 API',
    'chat.cmdRun': '执行 API 请求',
    'chat.cmdHelp': '显示可用命令',

    // Node Types
    'node.apiCall': 'API 调用',
    'node.auth': '认证',
    'node.condition': '条件',
    'node.loop': '循环',
    'node.assert': '断言',
    'node.transform': '转换',
    'node.delay': '延迟',
    'node.log': '日志',
    'node.script': '脚本',
    'node.useSimpleMode': '使用简洁模式',
    'node.supportedOperators': '支持的运算符:',
    'node.presetDurations': '预设延迟:',
    'node.availableApis': '可用 API:',
    'node.confirmDelete': '确认删除?',
  },
  'en-US': {
    // App Settings
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.appearance': 'Appearance',
    'settings.request': 'Request',
    'settings.proxy': 'Proxy',
    'settings.ssl': 'SSL',
    'settings.capture': 'Capture',
    'settings.shortcuts': 'Shortcuts',
    'settings.save': 'Save',
    'settings.privacy': 'Privacy',
    'settings.backup': 'Backup',
    'settings.exportSettings': 'Export Settings',
    'settings.exportSettings.desc': 'Export settings to file (excludes sensitive data)',
    'settings.importSettings': 'Import Settings',
    'settings.importSettings.desc': 'Import settings from file',
    'settings.importWarning': 'Import will overwrite current settings, sensitive data (like passwords) will not be imported',
    'settings.exported': 'Export successful',
    'settings.imported': 'Import successful',
    'settings.importFailed': 'Import failed',
    'settings.region': 'Region',
    'settings.font': 'Font',
    'settings.seconds': 's',
    'settings.minutes': 'min',
    'settings.oneMinute': '1 min',
    'settings.twoMinutes': '2 min',
    'settings.fiveMinutes': '5 min',
    'settings.twoSpaces': '2 spaces',
    'settings.fourSpaces': '4 spaces',
    'settings.timeout': 'Timeout',
    'settings.redirect': 'Redirect',
    'settings.clientCertificate': 'Client Certificate',
    'settings.certFile': 'Client certificate file (.pem, .crt)',
    'settings.keyFile': 'Private key file (.pem, .key)',
    'settings.caCertFile': 'CA certificate file (.pem, .crt, .ca-bundle)',
    'settings.timeout5s': '5s',
    'settings.timeout10s': '10s',
    'settings.timeout15s': '15s',
    'settings.timeout30s': '30s',
    'settings.timeout60s': '60s',
    'settings.timeout120s': '120s',

    // Audit Log
    'audit.title': 'Audit Log',
    'audit.operationAuditLog': 'Operation Audit Log',
    'audit.recordCount': '{count} records',
    'audit.export': 'Export',
    'audit.clear': 'Clear',
    'audit.categoryFilter': 'Category Filter',
    'audit.all': 'All',
    'audit.searchPlaceholder': 'Search operation description...',
    'audit.noAuditLogs': 'No audit logs',
    'audit.exportTitle': 'Export Audit Log',
    'audit.exportMessage': 'Will export {count} audit log records in JSON format',
    'audit.cancel': 'Cancel',
    'audit.confirmClear': 'Clear',
    'audit.clearConfirmTitle': 'Clear Audit Log',
    'audit.clearConfirmMessage': 'Are you sure you want to clear all audit logs? This action cannot be undone.',
    'audit.cleared': 'Audit log cleared',

    // App
    'app.loading': 'Loading...',
    'app.theme.dark': 'Dark',
    'app.theme.light': 'Light',
    'app.theme.blue': 'Sunset',
    'app.theme.notion': 'Warm White',
    'app.theme.vermont': 'Pine',
    'app.expand': 'Expand',
    'app.collapse': 'Collapse',

    // Diff Viewer
    'diff.loading': 'Loading diff...',
    'diff.noDiff': 'No diff found',
    'diff.linesAdded': '+{count} lines added',
    'diff.linesRemoved': '-{count} lines removed',
    'diff.selectCommitA': 'Select commit A',
    'diff.selectCommitB': 'Select commit B (optional, default HEAD)',
    'diff.compare': 'Compare',

    // Mock Server
    'mock.title': 'Mock Server',
    'mock.loadStatusFailed': 'Failed to load Mock server status',
    'mock.loadRulesFailed': 'Failed to load Mock rules',
    'mock.portRangeError': 'Port must be between 1024-65535',
    'mock.startedOnPort': 'Mock Server started on port {port}',
    'mock.startFailed': 'Start failed: {error}',
    'mock.stopped': 'Mock Server stopped',
    'mock.stopFailed': 'Stop failed: {error}',
    'mock.newRule': 'New Rule',
    'mock.ruleAdded': 'Rule added',
    'mock.ruleAddFailed': 'Failed to add rule: {error}',
    'mock.ruleDeleted': 'Rule deleted',
    'mock.ruleDeleteFailed': 'Failed to delete rule: {error}',
    'mock.ruleUpdateFailed': 'Update failed: {error}',
    'mock.requestLogCleared': 'Request log cleared',
    'mock.requestLogClearFailed': 'Failed to clear log: {error}',
    'mock.serverDescription': 'Start local HTTP server to intercept requests and return mock responses',
    'mock.runningOnPort': 'Running on :{port}',
    'mock.port': 'Port:',
    'mock.stopping': 'Stopping...',
    'mock.stop': 'Stop',
    'mock.starting': 'Starting...',
    'mock.start': 'Start',
    'mock.rules': 'Rules:',
    'mock.requests': 'Requests:',
    'mock.mockRules': 'Mock Rules',
    'mock.addRule': '+ Add Rule',
    'mock.addRuleHint': 'Start Mock Server to add rules',
    'mock.noRules': 'No rules yet, click "Add Rule" to create',
    'mock.delete': 'Delete',
    'mock.allMethods': 'ALL',
    'mock.anyPath': '(Any path)',
    'mock.requestLog': 'Request Log',
    'mock.clearLog': 'Clear Log',
    'mock.viewLogHint': 'Start Mock Server to view request logs',
    'mock.noRequestLog': 'No request logs yet, sent requests will appear here',
    'mock.usageInstructions': 'Usage Instructions',
    'mock.startServerAndNotePort': 'Start Mock Server and note the port number',
    'mock.useLocalhostPrefix': 'Use http://localhost:{port} prefix in request URL',
    'mock.addMatchingRules': 'Add matching rules with path patterns and response templates',
    'mock.mockServerIntercepts': 'Mock Server will intercept and return configured responses',
    'mock.portMustBe1024': 'Port must be between 1024-65535',

    // General
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.enabled': 'Enabled',
    'common.disabled': 'Disabled',
    'common.on': 'On',
    'common.off': 'Off',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.reset': 'Reset',
    'common.resetAll': 'Reset All',
    'common.rename': 'Rename',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.search.placeholder': 'Search...',
    'common.noContent': 'No content',
    'common.importToStart': 'Import API docs to start',
    'common.moveTo': 'Move to...',
    'common.insert': 'Insert',
    'common.lock': 'Lock',
    'common.unlock': 'Unlock',
    'common.description': 'Description',
    'common.addDescription': 'Add description',

    // Code Gen
    'codegen.title': 'Code Generation',
    'codegen.copyCode': 'Copy Code',
    'codegen.codeCopied': 'Code copied to clipboard',
    'codegen.noRequestData': '// No request data',
    'common.close': 'Close',
    'common.copy': 'Copy',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.true': 'True',
    'common.false': 'False',

    // Common Errors
    'common.error.urlRequired': 'Please enter URL',
    'common.error.requestCancelled': 'Request cancelled',
    'common.error.sslCertReadFailed': 'Failed to read SSL certificate',
    'common.error.mockPreviewFailed': 'Failed to generate Mock preview',

    // OAuth Errors
    'oauth.error.incompleteConfig': 'Please complete OAuth configuration (Auth URL, Client ID, Callback URL)',
    'oauth.error.cannotOpenBrowser': 'Cannot open browser automatically, please visit manually: ',
    'oauth.error.enterAuthCode': 'Please enter authorization code and complete Token configuration',
    'oauth.error.tokenExchangeFailed': 'Token exchange failed: ',
    'oauth.error.ensureRefreshToken': 'Please ensure Refresh Token and complete Token configuration',
    'oauth.error.refreshFailed': 'Refresh failed: ',
    'oauth.error.incompleteTokenConfig': 'Please complete Token configuration (Access Token URL, Client ID, Client Secret)',
    'oauth.error.clientCredentialsFailed': 'Client Credentials failed: ',

    // Script Errors
    'script.error.empty': 'Script is empty',
    'script.error.executionFailed': 'Execution error: ',
    'script.error.executionComplete': 'Script execution complete',
    'script.warn.preBuild': 'preBuild warning: ',
    'script.warn.preSend': 'preSend warning: ',
    'script.warn.postResponse': 'postResponse warning: ',

    // Field Editor
    'field.title': 'Field Settings',
    'field.field': 'Field',
    'field.genType': 'Generate Type',
    'field.suffix': 'Suffix',
    'field.suffixNone': 'None',
    'field.suffixSeq': '_001 (Sequence)',
    'field.suffixCustom': 'Custom',
    'field.customSuffix': 'Custom Suffix',
    'field.preview': 'Preview',
    'field.apply': 'Apply',
    'field.cancel': 'Cancel',
    'field.loading': 'Loading...',
    'field.empty': '(Empty)',

    // GraphQL Schema Docs
    'graphql.schemaDocs': 'Schema Docs',
    'graphql.typesCount': '{count} types',
    'graphql.searchTypes': 'Search types, fields...',
    'graphql.all': 'All',
    'graphql.object': 'Object',
    'graphql.input': 'Input',
    'graphql.enum': 'Enum',
    'graphql.interface': 'Interface',
    'graphql.union': 'Union',
    'graphql.noMatch': 'No matching types found',

    // Toast Messages
    'toast.collectionRenamed': 'Collection renamed',
    'toast.requestRenamed': 'Request renamed',
    'toast.collectionDeleted': 'Collection deleted',
    'toast.requestDeleted': 'Request deleted',
    'toast.collectionExported': 'Collection exported',
    'toast.movedTo': 'Moved to',

    // Appearance
    'appearance.theme': 'Theme',
    'appearance.theme.dark': 'Dark',
    'appearance.theme.light': 'Light',
    'appearance.theme.system': 'System',
    'appearance.theme.blue': 'Sunset',
    'appearance.theme.notion': 'Warm White',
    'appearance.theme.vermont': 'Pine',
    'appearance.fontSize': 'Font Size',
    'appearance.tabSize': 'Tab Size',
    'appearance.lineHeight': 'Line Height',
    'appearance.fontSize.compact': 'Compact',
    'appearance.fontSize.normal': 'Normal',
    'appearance.fontSize.relaxed': 'Relaxed',
    'appearance.theme.description': 'Choose interface color scheme',
    'appearance.fontSize.description': 'Adjust interface text size',
    'appearance.tabSize.description': 'Code editor indentation size',
    'appearance.lineHeight.description': 'Code editor line spacing',

    // General Settings
    'general.autoSave': 'Auto Save',
    'general.autoSave.description': 'Automatically save current work state periodically',
    'general.autoSaveInterval': 'Save Interval',
    'general.sensitiveMask': 'Sensitive Data Masking',
    'general.sensitiveMask.description': 'Hide sensitive information in logs and responses',
    'general.language': 'Language',
    'general.language.description': 'Select interface display language',
    'general.languageChinese': 'Chinese',
    'general.languageEnglish': 'English',
    'general.seconds': 'seconds',
    'general.minute': '1 minute',
    'general.minutes': 'minutes',

    // Request Settings
    'request.timeout': 'Request Timeout',
    'request.timeout.description': 'Maximum wait time for HTTP requests',
    'request.followRedirects': 'Follow Redirects',
    'request.followRedirects.description': 'Automatically follow 3xx response redirects',

    // Proxy Settings
    'proxy.enable': 'Enable Proxy',
    'proxy.enable.description': 'Send requests through proxy server',
    'proxy.protocol': 'Protocol',
    'proxy.host': 'Host',
    'proxy.port': 'Port',
    'proxy.username': 'Username (optional)',
    'proxy.password': 'Password (optional)',
    'proxy.url': 'Proxy URL',

    // SSL Settings
    'ssl.enableMtls': 'Enable mTLS',
    'ssl.enableMtls.description': 'Use client certificates for mutual authentication',
    'ssl.clientCert': 'Client Certificate',
    'ssl.privateKey': 'Private Key',
    'ssl.caCert': 'CA Certificate',

    // Capture Settings
    'capture.enable': 'Enable Capture',
    'capture.enable.description': 'Capture HTTP requests and responses',
    'capture.allowedDomains': 'Allowed Domains',
    'capture.allowedDomains.description': 'Empty means all domains allowed. Supports wildcards *.example.com',
    'capture.excludePatterns': 'Exclude Patterns (Regex)',
    'capture.excludePatterns.description': 'Requests matching these patterns will not be captured',
    'capture.addDomain': 'Add',
    'capture.addPattern': 'Add',
    'capture.noRestrictions': 'No restrictions',
    'capture.placeholder.domain': 'localhost, *.example.com',
    'capture.placeholder.pattern': '\\.js(\\?.*)?$',
    'capture.capturedRequests': 'Captured Requests',
    'capture.clickToExpand': 'Click to expand',
    'capture.clear': 'Clear',
    'capture.collapse': 'Collapse',
    'capture.moreRequests': '{count} more...',
    'capture.noCapturedRequests': 'No captured requests',
    'capture.connected': 'Connected',
    'capture.disconnected': 'Disconnected',

    // Shortcuts
    'shortcuts.title': 'Keyboard Shortcuts',
    'shortcuts.description': 'Configure global keyboard shortcuts',

    // Workspace
    'workspace.apis': 'APIs',
    'workspace.collections': 'Collections',
    'workspace.capture': 'Capture',
    'workspace.noEndpoints': 'No endpoints',

    // Request Builder
    'request.url': 'URL',
    'request.send': 'Send',
    'request.method': 'Method',
    'request.params': 'Params',
    'request.headers': 'Headers',
    'request.body': 'Body',
    'request.auth': 'Auth',
    'request.response': 'Response',
    'request.urlPlaceholder': 'Enter request URL...',
    'request.detail': 'Request Details',
    'request.preview': 'Preview before sending',
    'request.rawUrl': 'Raw URL:',
    'request.binaryResponse': '📦 Binary Response',
    'request.xmlResponse': '</> XML Response',
    'request.textResponse': 'Text Response ({type})',
    'request.noSchema': 'No schema',
    'request.updateRequest': 'Update Request',
    'request.saveRequest': 'Save Request',
    'request.requestName': 'Request Name',
    'request.inputRequestName': 'Enter request name',
    'request.urlNone': '(None)',
    'request.saving': 'Saving...',
    'request.update': 'Update',
    'request.save': 'Save',

    // Scripts Completion
    'scripts.completion.environment': 'Environment variable',
    'scripts.completion.utils': 'Utility function',
    'scripts.completion.variables': 'Global variable',
    'scripts.completion.lodash': 'Lodash utility',
    'scripts.completion.console': 'Console output',
    'scripts.completion.test': 'Define test case',
    'scripts.completion.expect': 'Assertion',
    'scripts.completion.request': 'Request object',
    'scripts.completion.response': 'Response object',
    'scripts.completion.setTimeout': 'Delay execution',
    'scripts.completion.info': 'Request info',
    'scripts.completion.getEnv': 'Get environment variable',
    'scripts.completion.setEnv': 'Set environment variable',
    'scripts.completion.toObject': 'Convert to object',
    'scripts.completion.sha256': 'SHA-256 hash',
    'scripts.completion.md5': 'MD5 hash',
    'scripts.completion.randomUuid': 'Generate random UUID',
    'scripts.completion.urlEncode': 'URL encode',
    'scripts.completion.urlDecode': 'URL decode',
    'scripts.completion.base64Encode': 'Base64 encode',
    'scripts.completion.base64Decode': 'Base64 decode',
    'scripts.completion.getVar': 'Get variable',
    'scripts.completion.setVar': 'Set variable',
    'scripts.completion.hasVar': 'Check variable exists',
    'scripts.completion.getNested': 'Get nested value',
    'scripts.completion.setNested': 'Set nested value',
    'scripts.completion.hasProp': 'Check property exists',
    'scripts.completion.pick': 'Pick properties',
    'scripts.completion.omit': 'Omit properties',
    'scripts.completion.merge': 'Merge objects',
    'scripts.completion.cloneDeep': 'Deep clone',
    'scripts.completion.map': 'Map',
    'scripts.completion.filter': 'Filter',
    'scripts.completion.find': 'Find',
    'scripts.completion.log': 'Output log',
    'scripts.completion.warn': 'Output warning',
    'scripts.completion.error': 'Output error',
    'scripts.completion.url': 'Request URL',
    'scripts.completion.method': 'Request method',
    'scripts.completion.deleteEnv': 'Delete environment variable',
    'scripts.completion.deleteVar': 'Delete variable',
    'scripts.completion.params': 'Query parameters',
    'scripts.completion.headers': 'Request headers',
    'scripts.completion.value': 'Value',
    'scripts.completion.bodyJson': 'Request body (JSON)',
    'scripts.completion.body': 'Request body',
    'scripts.completion.resBody': 'Response body',
    'scripts.completion.statusCode': 'Response status code',
    'scripts.completion.statusText': 'Response status text',
    'scripts.completion.resHeaders': 'Response headers',
    'scripts.completion.resTime': 'Response time (ms)',
    'scripts.completion.parseJson': 'Parse JSON',
    'scripts.completion.getText': 'Get text',
    'scripts.completion.resBodyFields': 'Response body fields',
    'scripts.completion.requestId': 'Request ID',
    'scripts.completion.iteration': 'Current iteration',
    'scripts.completion.iterationCount': 'Total iterations',

    // Schema Tree Editor
    'schema.rootNode': 'Root node',
    'schema.fieldName': 'Field name',
    'schema.description': 'Description',
    'schema.value': 'Value',
    'schema.enabled': 'Enabled',
    'schema.required': 'Required',
    'schema.addChild': 'Add child field',
    'schema.delete': 'Delete',
    'schema.sample': 'Sample',

    // Test Data Generator
    'generator.sequence': 'Sequence',
    'generator.random': 'Random String',
    'generator.date': 'Date',
    'generator.uuid': 'UUID',
    'generator.nullify': 'Clear Value',
    'generator.prefix': 'Prefix',
    'generator.optionalPrefix': 'Prefix (optional)',
    'generator.preview': 'Preview: {preview}',
    'generator.fillEmptyOnly': 'Fill empty only',
    'generator.apply': 'Apply',
    'generator.close': 'Close',

    // Response
    'response.status': 'Status',
    'response.time': 'Time',
    'response.size': 'Size',
    'response.noResponse': 'No response',

    // Collection Panel
    'collection.operations': 'Collection Operations',
    'collection.export': 'Export',
    'collection.duplicate': 'Duplicate',
    'collection.exportCollection': 'Export Collection',
    'collection.copyPostmanJson': 'Copy Postman JSON',
    'collection.copyOpenApiJson': 'Copy OpenAPI JSON',
    'collection.copyHarJson': 'Copy HAR JSON',
    'collection.importFromFile': 'Import from File',
    'collection.importFromClipboard': 'Import from Clipboard',
    'collection.selectJsonFile': 'Select JSON File',
    'collection.pasteJson': 'Paste Postman Collection JSON...',
    'collection.copiedToClipboard': 'Copied to clipboard',
    'collection.importSuccess': 'Import successful',
    'collection.importFailed': 'Import failed',
    'collection.checkJsonFormat': 'Import failed, please check JSON format',
    'collection.import': 'Import',

    // Auth Items Form
    'auth.itemsForm': 'Auth & Headers',
    'auth.addHeader': 'Add',
    'auth.addCookie': 'Add',
    'auth.addQuery': 'Add',
    'auth.addPath': 'Add',
    'auth.headerName': 'Header name',
    'auth.headerValue': 'Header value',
    'auth.cookieString': 'Cookie string',
    'auth.paramName': 'Parameter name',
    'auth.paramValue': 'Parameter value',
    'auth.pathPlaceholder': '{placeholder}',
    'auth.pathReplaceValue': 'Replace value',
    'auth.pathReplaceDescription': 'Replace {placeholder} in URL path with specified value',
    'auth.pathReplace': 'Path Replace',

    // List Mode
    'list.searchPlaceholder': 'Search...',
    'list.import': 'Import',
    'list.loading': 'Loading...',
    'list.noApis': 'No APIs',
    'list.filterEndpoints': 'Filter endpoints',
    'list.send': 'Send',
    'list.noMatchingEndpoints': 'No matching endpoints',
    'list.selectApiOnLeft': 'Select an API on the left',
    'list.semanticSearchMatch': 'Semantic search match or text search',

    // Env Panel
    'env.addVariable': 'Add Variable',
    'env.importExport': 'Import/Export',
    'env.export': 'Export',
    'env.import': 'Import',
    'env.importFailed': 'Import failed',
    'env.exportEnvConfig': 'Export environment config as JSON',
    'env.importEnvConfig': 'Import environment config from JSON file',

    // Collection
    'collection.new': 'New Collection',
    'collection.deleteConfirm': 'Are you sure you want to delete this collection?',
    'collection.title': 'Collections',
    'collection.savedRequests': 'Saved Requests',
    'collection.dragToSort': 'Drag to sort',
    'collection.newCollection': 'New Collection',
    'collection.collectionName': 'Collection name',
    'collection.cancel': 'Cancel',
    'collection.create': 'Create',
    'collection.exportAll': 'Export all collections',
    'collection.importCollection': 'Import collection',
    'collection.duplicateCollection': 'Duplicate collection',
    'collection.deleteCollection': 'Delete collection',
    'collection.copyCollection': 'Copy collection',

    // Error Boundary
    'error.title': 'An Error Occurred',
    'error.message': 'The application encountered an error. Try refreshing the page or returning to the home page.',
    'error.details': 'Error Details',
    'error.refresh': 'Refresh Page',
    'error.recover': 'Try Recovery',

    // Environment Config
    'env.deleteConfirm': 'Are you sure you want to delete environment ',
    'env.importPlaceholder': 'Paste environment JSON data...',
    'env.importJson': 'Import Environment JSON',
    'env.cancel': 'Cancel',
    'env.loading': 'Loading...',
    'env.newEnv': 'New Environment',
    'env.deleteEnv': 'Delete Environment',
    'env.copyEnv': 'Copy Environment',
    'env.exportEnv': 'Export Environment',
    'env.importEnv': 'Import Environment',
    'env.moveUp': 'Move Up',
    'env.moveDown': 'Move Down',
    'env.envName': 'Environment Name',
    'env.groupName': 'Group Name',
    'env.newGroup': 'New Group',
    'env.rename': 'Rename',
    'env.delete': 'Delete',
    'env.variables': 'variables',
    'env.group': 'Group',
    'env.selectGroup': 'Please select a group',
    'env.environment': 'Environment',
    'env.environmentVariables': 'Environment Variables',

    // Saved Request
    'savedRequest.red': 'Red',
    'savedRequest.orange': 'Orange',
    'savedRequest.yellow': 'Yellow',
    'savedRequest.green': 'Green',
    'savedRequest.cyan': 'Cyan',
    'savedRequest.blue': 'Blue',
    'savedRequest.purple': 'Purple',
    'savedRequest.pink': 'Pink',
    'savedRequest.none': 'None',
    'savedRequest.color': 'Color: {color}',
    'savedRequest.setColor': 'Set Color',
    'savedRequest.editTags': 'Edit Tags',
    'savedRequest.clearAllTags': 'Clear All Tags',
    'savedRequest.moveTo': 'Move to...',
    'savedRequest.enterTagPlaceholder': 'Enter tag and press Enter',
    'savedRequest.moveToCollection': 'Move to Collection',

    'env.envNamePlaceholder': 'Environment name',
    'env.groupNamePlaceholder': 'Group name',
    'env.pleaseInputJson': 'Please enter JSON data',
    'env.pleaseSelectGroup': 'Please select a group',
    'env.variablesLabel': 'Variables:',
    'env.showAll': '👁 Show all',
    'env.hideAll': '🙈 Hide all',
    'env.inherited': 'Inherited',
    'env.toggleSensitive': 'Show/Hide sensitive values',
    'env.duplicateVarName': 'Duplicate variable name',
    'env.noVariables': 'No variables yet, click "Add Variable" above to start',
    'env.emptyKeyName': 'Variable name cannot be empty',
    'env.keyExists': 'Variable name already exists',
    'env.invalidKeyName': 'Variable name can only contain letters, numbers, underscores and hyphens, and cannot start with a number',
    'env.addVariableTitle': 'Add Variable',
    'env.variableName': 'Variable name',
    'env.loadFailed': 'Failed to load environment config',
    'env.envAlreadyExists': 'Environment already exists',
    'env.createEnvFailed': 'Failed to create environment',
    'env.mustKeepOneEnv': 'At least one environment must be kept',
    'env.deleteEnvFailed': 'Failed to delete environment',
    'env.envNameAlreadyExists': 'Environment name already exists',
    'env.renameEnvFailed': 'Failed to rename environment',
    'env.envNotFound': 'Environment not found',
    'env.copyEnvFailed': 'Failed to copy environment',
    'env.sortEnvFailed': 'Failed to sort environments',
    'env.groupAlreadyExists': 'Group already exists',
    'env.addGroupFailed': 'Failed to add group',
    'env.mustKeepOneGroup': 'At least one group must be kept',
    'env.deleteGroupFailed': 'Failed to delete group',
    'env.groupNameAlreadyExists': 'Group name already exists',
    'env.renameGroupFailed': 'Failed to rename group',
    'env.saveVarFailed': 'Failed to save variable',
    'env.toggleVarFailed': 'Failed to toggle variable status',
    'env.deleteVarFailed': 'Failed to delete variable',

    // Headers Panel
    'headers.savePreset': 'Save Header Preset',
    'headers.presetName': 'Preset name',
    'headers.save': 'Save',
    'headers.managePresets': 'Manage Custom Presets',
    'headers.noCustomPresets': 'No custom presets',
    'headers.headersCount': 'headers',
    'headers.delete': 'Delete',
    'headers.addPreset': 'Add Preset',
    'headers.custom': 'Custom',
    'headers.manage': 'Manage',
    'headers.generate': 'Generate',
    'headers.reset': 'Reset',
    'headers.unlock': 'Unlock',
    'headers.lock': 'Lock',
    'headers.commonHeaders': 'Common Headers',
    'headers.description': 'Description',
    'headers.addDescription': 'Add description',
    'headers.addHeader': 'Add Header',
    'headers.saveAsPreset': 'Save as Custom Preset',
    'headers.smartGenerate': 'Smart generate values based on header name',

    // Params Panel
    'params.title': 'Query Parameters',
    'params.autoEncode': 'Auto URL Encode',
    'params.encode': 'Encode',
    'params.generate': 'Generate',
    'params.reset': 'Reset',
    'params.unlock': 'Unlock',
    'params.lock': 'Lock',
    'params.historyValues': 'History Values',
    'params.string': 'String',
    'params.number': 'Number',
    'params.boolean': 'Boolean',
    'params.array': 'Array',
    'params.editField': 'Edit this field',
    'params.description': 'Description',
    'params.addDescription': 'Add description',
    'params.copy': 'Copy (Ctrl+C)',
    'params.paste': 'Paste (Ctrl+V)',
    'params.addParam': 'Add Parameter',
    'params.invalidNumber': 'Must be a valid number',
    'params.invalidBoolean': 'Must be true/false',
    'params.invalidArray': 'Array format: value1,value2',
    'params.arrayFormat': 'Array format: value1,value2',
    'params.schemaType': 'Schema type: ',
    'params.paramType': 'Parameter type',

    // Request Builder
    'request.close': 'Close',
    'request.closeLeft': 'Close Left',
    'request.closeRight': 'Close Right',
    'request.closeOthers': 'Close Others',
    'request.updated': 'Request updated',
    'request.deleted': 'Request deleted',
    'request.deleteFailed': 'Delete failed',
    'request.savedTo': 'Saved to',
    'request.saveFailed': 'Save failed',
    'request.myCollection': 'My Collection',
    'request.unnamedRequest': 'Unnamed Request',
    'request.clearConfirm': 'Are you sure you want to clear the current request?',
    'request.confirm': 'Confirm',
    'request.cancel': 'Cancel',
    'request.parseUrl': 'Parse URL Parameters',
    'request.urlHasParams': 'URL contains query parameters. Parse to Params panel?',
    'request.parse': 'Parse',
    'request.scripts': 'Scripts',
    'request.history': 'History',
    'request.requestDescription': 'Request Description',
    'request.added': 'Added',
    'request.addRequestDescription': 'Add request description...',
    'request.requestSchema': 'Request Schema',
    'request.parameterCount': '{count}',
    'request.paramName': 'Parameter name',
    'request.rename': 'Rename:',
    'request.noRequestParams': 'No request parameters defined',
    'request.collapse': 'Collapse',
    'request.edit': 'Edit',
    'request.responseSchema': 'Response Schema',
    'request.responseDescription': 'Response description',
    'request.noResponseDefinition': 'No response definition',
    'request.binary': 'Binary',
    'response.addResponse': 'Add Response',
    'response.add': 'Add',
    'response.noResponseDefinition': 'No response definition, click above to add',
    'response.collapse': 'Collapse',
    'response.editSchema': 'Edit Schema',
    'response.delete': 'Delete',
    'response.binaryResponse': 'Binary Response ({type})',
    'response.textResponse': 'Text Response',
    'response.xmlResponse': 'XML Response',
    'response.noSchemaDefinition': 'No schema definition',

    // URL Bar
    'url.noEnvironment': 'No Environment',
    'url.history': 'History',
    'url.preview': 'URL Preview',
    'url.highlight': 'Highlight',
    'url.replaceValue': 'Replace Value',
    'url.encodePreview': 'Encoded Preview',
    'url.undefinedVariable': 'Undefined Variable',
    'url.envVariables': 'Environment Variables',
    'url.globalVariables': 'Global Variables',
    'url.send': 'Send',
    'url.cancel': 'Cancel',
    'url.saveRequest': 'Save Request (Ctrl+S)',
    'url.save': 'Save',
    'url.code': 'Code',
    'url.settings': 'Settings',
    'url.autoParseUrl': 'Auto Parse URL',
    'url.autoEncodeUrl': 'Auto Encode URL',
    'url.sslVerify': 'Verify SSL',
    'url.timeout': 'Timeout (ms)',
    'url.noTimeout': 'No Timeout',
    'url.timeoutValue': 'Timeout: ',
    'url.retryOnFailure': 'Retry on Failure',
    'url.maxRetries': 'Max Retries',
    'url.retryDelay': 'Retry Delay (ms)',
    'url.horizontal': 'Horizontal',
    'url.vertical': 'Vertical',
    'url.requestFocus': 'Request Focus',
    'url.responseFocus': 'Response Focus',

    // Mock Config
    'mock.title.description': 'Unified data mock configuration, supports field generation and response mock',
    'mock.generate': 'Generate',
    'mock.mock': 'Mock',
    'mock.server': 'Server',
    'mock.preview': 'Live Preview',
    'mock.loading': 'Loading...',
    'mock.names': 'names',
    'mock.cities': 'cities',
    'mock.builtinRules': 'Builtin Rules',
    'mock.hide': 'Hide',
    'mock.show': 'Show',
    'mock.resetToDefault': 'Reset to Default',
    'mock.customRules': 'Custom Rules',
    'mock.noCustomRules': 'No custom rules',
    'mock.customRules.description': 'Rule name → Rule type mapping, used in response templates as {{ruleName}}',
    'mock.ruleNamePlaceholder': 'Rule name, e.g. userEmail',
    'mock.addCustomRule': 'Add Custom Rule',
    'mock.fieldMatchRules': 'Field Match Rules',
    'mock.noFieldMatchRules': 'No field match rules',
    'mock.fieldMatchRules.description': 'Regex match field name → Rule type, for auto field detection',
    'mock.patternPlaceholder': 'Regex pattern, e.g. user_*',
    'mock.addFieldMatchRule': 'Add Field Match Rule',
    'mock.languageDataPool': 'Language / Data Pool',
    'mock.chinese': 'Chinese',
    'mock.english': 'English',
    'mock.current': 'Current',
    'mock.smartDetection': 'Smart Detection',
    'mock.autoDetectType': 'Auto detect type based on field name',
    'mock.smartDetection.description': 'When enabled, field names containing email → email, phone → phone, city → city, etc.',
    'mock.sequenceGeneration': 'Sequence Generation',
    'mock.prefix': 'Prefix',
    'mock.startValue': 'Start Value',
    'mock.zeroPadding': 'Zero Padding',
    'mock.example': 'Example',
    'mock.quickGenerate': 'Quick Generate',
    'mock.quickGenerate.description': 'In Request Builder, select body type as "mock" to auto generate test data',
    'mock.quickGenerate.description2': 'Or click "Generate Mock Data" in API detail panel',
    'mock.responseMock': 'Response Mock',
    'mock.responseMock.description': 'Intercept matching requests and return mock response',
    'mock.templateVariableRules': 'Template Variable Rules',
    'mock.noTemplateVariableRules': 'No template variable rules',
    'mock.templateVariableRules.description': '{{variableName}} → Rule type mapping',
    'mock.variableName': 'Variable Name',
    'mock.addTemplateVariableRule': 'Add Template Variable Rule',
    'mock.responseRules': 'Response Rules',
    'mock.noResponseRules': 'No response rules, click "New Rule" to create',
    'mock.disabled': 'Disabled',
    'mock.edit': 'Edit',
    'mock.ruleNameLabel': 'Rule Name',
    'mock.ruleNamePlaceholder2': 'e.g. User List',
    'mock.requestMethod': 'Request Method',
    'mock.pathMatch': 'Path Match (Regex)',
    'mock.pathMatchPlaceholder': 'e.g. /api/users or leave empty to match any',
    'mock.statusCode': 'Status Code',
    'mock.delay': 'Delay (ms)',
    'mock.responseTemplate': 'Response Template (JSON)',
    'mock.responseTemplate.description': 'Use {{variable}} placeholder, available rule types like {{email}}, {{name}}',
    'mock.editRule': 'Edit Rule',
    'mock.deleteRule': 'Delete Rule',
    'mock.confirmDeleteRule': 'Are you sure you want to delete this rule?',
    'mock.add': 'Add',

    // Flow Canvas
    'flow.stepModeOn': 'Step Mode: On',
    'flow.stepModeOff': 'Step Mode: Off',
    'flow.stepMode': 'Step Mode',
    'flow.stepExecute': 'Step Execute Next Node',
    'flow.continueRun': 'Continue',
    'flow.run': 'Run',
    'flow.pause': 'Pause',
    'flow.stop': 'Stop',
    'flow.reset': 'Reset',
    'flow.maxParallelNodes': 'Max Parallel Nodes',
    'flow.unlimited': 'Unlimited',
    'flow.log': 'Log',
    'flow.noLog': 'No log',
    'flow.result': 'Result',
    'flow.noResult': 'No result',
    'flow.undefinedVariables': 'Undefined Variables',
    'flow.error.circularDependency': 'Circular dependency detected',
    'flow.configureNode': 'Configure',
    'flow.configureNodes': 'Configure',
    'flow.addChildNode': 'Add Child Node',
    'flow.copyNode': 'Copy Node',
    'flow.copyNodes': 'Copy Nodes',
    'flow.saveAsSubflow': 'Save as Subflow',
    'flow.saveNodesAsSubflow': 'Save as Subflow',
    'flow.runNode': 'Run Node',
    'flow.runNodes': 'Run Nodes',
    'flow.runCurrentNode': 'Run Current Node',
    'flow.runDownstream': 'Run Downstream',
    'flow.toggleBreakpoint': 'Toggle Breakpoint',
    'flow.deleteNode': 'Delete Node',
    'flow.deleteNodes': 'Delete Nodes',
    'flow.pleaseSelectNode': 'Please select nodes first, then save as subflow',
    'flow.savedNodesAsSubflow': 'Saved',
    'flow.environment': 'Environment',
    'flow.concurrency': 'Concurrency',
    'flow.subflowLibrary': 'Subflow Library',
    'flow.insertOrDeleteHint': 'Click "Insert" to add the subflow to canvas, or "Delete" to remove',
    'flow.noSubflows': 'No subflows',
    'flow.createSubflowHint': 'Create one by selecting "Save as Subflow" from a node\'s right-click menu',
    'flow.saveFlowAutoSave': 'Save flow (auto-saves every change)',
    'flow.loadExistingFlow': 'Load existing flow',
    'flow.load': 'Load',
    'flow.insertSubflow': 'Insert subflow',
    'flow.subflows': 'Subflows',
    'flow.savedFlows': 'Saved Flows',
    'flow.noSavedFlows': 'No saved flows',
    'flow.exportFlow': 'Export Flow',
    'flow.importFlow': 'Import Flow',
    'flow.loadListFailed': 'Failed to load flow list',
    'flow.saveFailed': 'Failed to save flow',
    'flow.loadFailed': 'Failed to load flow',
    'flow.deleteFailed': 'Failed to delete flow',
    'flow.importInvalidFormat': 'Invalid flow file format',
    'flow.importInvalidStructure': 'Invalid flow data structure',
    'flow.importSuccess': 'Flow imported successfully',
    'flow.importFailed': 'Failed to import flow',
    'flow.saveSubflowFailed': 'Failed to save subflow',
    'flow.instantiateSubflowFailed': 'Failed to instantiate subflow',
    'flow.exportFailed': 'Failed to export flow',
    'flow.exportSuccess': 'Flow exported successfully',
    'flowauth.none': 'None',
    'flowauth.custom': 'Custom',
    'flowauth.inputCustomPrefix': 'Enter custom prefix',
    'flowauth.username': 'Username',
    'flowauth.password': 'Password',
    'flowauth.getToken': 'Get Token',
    'flowauth.copy': 'Copy',
    'flow.scope': 'Scope',
    'flow.nodeOutput': 'Node Output',
    'flow.envVariable': 'Environment Variable',
    'flow.globalVariable': 'Global Variable',
    'flow.workflowVariable': 'Workflow Variable',
    'flow.executionInfo': 'Execution Info',
    'flow.collapse': 'Collapse',
    'flow.executionOrder': 'Execution Order',
    'flow.logs': 'Logs',
    'flow.clear': 'Clear',
    'flow.results': 'Results',
    'flow.success': 'Success',
    'flow.failure': 'Failure',
    'flow.resultCount': 'results',
    'flow.noResults': 'No results',
    'flow.variableWatch': 'Variable Watch',
    'flow.addVariable': '+ Add',
    'flow.noVariables': 'No variables',
    'flow.useVariableSyntax': 'Use {"{{variableName}}"} syntax to reference variables',
    'flow.clickToEdit': 'Click to edit',
    'flow.empty': '(empty)',
    'flow.variableSyntax': 'Variable Syntax:',
    'flow.globalVar': 'Global variables:',
    'flow.envVar': 'Environment variables:',
    'flow.workflowVar': 'Workflow variables:',
    'flow.nodeOutputVar': 'Node outputs:',
    'flow.syntaxError': 'Syntax error:',
    'flow.running': 'Running...',
    'flow.runTest': 'Run Test',
    'flow.availableInputs': 'Available: inputs, setOutput(key, value), console.log()',
    'flow.console': 'Console',
    'flow.all': 'All',
    'flow.info': 'Info',
    'flow.warn': 'Warning',
    'flow.error': 'Error',
    'flow.clearLogs': 'Clear',
    'flow.consoleOutputHint': 'Console output will appear after script execution',
    'flow.executionFailed': 'Workflow execution failed',
    'flow.executionStopped': 'Execution stopped',
    'flow.pleaseStartStepMode': 'Please start step mode first',
    'flow.pleaseEnableStepMode': 'Please enable step mode first',
    'flow.steppingCancelled': 'Stepping execution cancelled',
    'flow.breakpointEnabled': 'Breakpoint enabled',

    // Git Panel
    'git.title': 'Git Version Control',
    'git.pleaseInputCommitMessage': 'Please enter commit message',
    'git.confirmSwitchBranch': 'Are you sure you want to switch to branch ',
    'git.confirmCreateBranch': 'Are you sure you want to create branch ',
    'git.worktreeClean': 'Worktree clean',
    'git.hasUncommittedChanges': 'Has uncommitted changes',
    'git.refresh': 'Refresh',
    'git.tab.status': 'Status',
    'git.tab.history': 'History',
    'git.tab.branches': 'Branches',
    'git.tab.diff': 'Diff',
    'git.loading': 'Loading...',
    'git.noStatusData': 'No status data',
    'git.staged': 'Staged',
    'git.unstaged': 'Unstaged',
    'git.untracked': 'Untracked',
    'git.stageSelectedFiles': 'Stage selected files',
    'git.commitMessagePlaceholder': 'Enter commit message...',
    'git.commitFiles': 'Commit',
    'git.worktreeCleanNoChanges': 'Worktree clean, no changes',
    'git.noCommitHistory': 'No commit history',
    'git.confirmRollback': 'Are you sure you want to rollback to commit ',
    'git.useHardRollback': 'Use hard rollback (will lose all commits after)?\n\nCancel = soft rollback (keep changes)',
    'git.rollbackSuccess': 'Rollback successful',
    'git.rollbackFailed': 'Rollback failed',
    'git.rollbackToThisCommit': 'Rollback to this commit',
    'git.rollback': 'Rollback',
    'git.confirmRevert': 'Are you sure you want to revert commit ',
    'git.revertSuccess': 'Revert successful',
    'git.revertFailed': 'Revert failed',
    'git.revertThisCommit': 'Revert this commit (create new commit to undo changes)',
    'git.revert': 'Revert',
    'git.newBranchNamePlaceholder': 'New branch name...',
    'git.createBranch': 'Create Branch',
    'git.noBranches': 'No branches',
    'git.current': 'Current',

    // Scripts Panel
    'scripts.mode': 'Mode',
    'scripts.simpleMode': 'Simple Mode',
    'scripts.interceptorMode': 'Interceptor Mode',
    'scripts.add': 'Add',
    'scripts.delete': 'Delete',
    'scripts.noInterceptors': 'No interceptors',
    'scripts.runTests': 'Run Tests',
    'scripts.console': 'Console',
    'scripts.all': 'All',
    'scripts.info': 'Info',
    'scripts.warn': 'Warning',
    'scripts.error': 'Error',
    'scripts.clear': 'Clear',
    'scripts.export': 'Export',
    'scripts.consoleOutput': 'Console output will be displayed after script execution',
    'scripts.syntaxError': 'Syntax Error',
    'scripts.beforeRequest': 'Execute before request',
    'scripts.enable': 'Enable',
    'scripts.hint': 'Hint',
    'scripts.afterResponse': 'Execute after response',
    'scripts.emptyScript': 'Script is empty',
    'scripts.setTimeoutSimulated': 'setTimeout: Simulated delay {delay}ms',
    'scripts.scriptCompleted': '{type} script completed',
    'scripts.executionError': 'Execution error: {message}',
    'scripts.preBuild': 'Pre-Build',
    'scripts.preSend': 'Pre-Send',
    'scripts.postResponse': 'Post-Response',
    'scripts.postError': 'Post-Error',

    // Body Panel
    'body.none': 'None',
    'body.formData': 'Form Data',
    'body.graphQL': 'GraphQL',
    'body.schemaLoadSuccess': 'Schema loaded successfully',
    'body.schemaLoadFailed': 'Schema load failed',
    'body.schemaCleared': 'Schema cleared',
    'body.jsonFormatError': 'JSON format error, cannot format',
    'body.format': 'Format',
    'body.autoGenerate': 'Auto identify type and generate based on field name',
    'body.generate': 'Generate',
    'body.dragFileHere': 'Drag and drop file here to upload',
    'body.fileTooLarge': 'File too large',
    'body.selected': 'Selected',
    'body.clickToSelect': 'Click to select file',
    'body.removeFile': 'Remove file',
    'body.file': 'File',
    'body.text': 'Text',
    'body.description': 'Description',
    'body.addDescription': 'Add description',
    'body.fieldDescription': 'Field description',
    'body.addField': 'Add field',
    'body.dropToAdd': 'Drop to add',
    'body.bulkImport': 'Bulk Import',
    'body.pasteJsonOrQuery': 'Paste JSON object or QueryString',
    'body.import': 'Import',
    'body.loading': 'Loading...',
    'body.loadSchema': 'Load Schema',
    'body.clear': 'Clear',
    'body.schemaLoaded': 'Schema loaded',
    'body.hideDocs': 'Hide Docs',
    'body.viewDocs': 'View Docs',
    'body.selectBinaryFile': 'Select binary file',
    'body.fileExceedLimit': 'File exceeds limit',
    'body.noRequestBody': 'This request has no body',
    'body.noneLabel': 'None',
    'body.maxAllowed': 'Max allowed',
    'body.types': 'types',
    'body.graphQLSchemaUrl': 'GraphQL Schema URL (optional)',

    // Auth Panel
    'auth.fillCompleteOAuth': 'Please fill in complete OAuth configuration (Auth URL, Client ID, Callback URL)',
    'auth.cannotOpenBrowser': 'Cannot open browser automatically, please access manually: ',
    'auth.enterAuthCode': 'Please enter authorization code and fill in complete Token configuration',
    'auth.tokenExchangeFailed': 'Token exchange failed: ',
    'auth.configureRefreshToken': 'Please ensure Refresh Token and complete Token configuration are set',
    'auth.refreshFailed': 'Refresh failed: ',
    'auth.fillCompleteToken': 'Please fill in complete Token configuration (Access Token URL, Client ID, Client Secret)',
    'auth.clientCredentialsFailed': 'Client Credentials failed: ',
    'auth.none': 'None',
    'auth.bearer': 'Bearer',
    'auth.basic': 'Basic',
    'auth.apiKey': 'API Key',
    'auth.oauth2': 'OAuth 2.0',
    'auth.aws': 'AWS',
    'auth.custom': 'Custom',
    'auth.customPrefix': 'Enter custom prefix',
    'auth.jwt': 'JWT',
    'auth.bearerJWT': 'BearerJWT',
    'auth.token': 'Token',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.tokenTypeDefault': 'Token Type (default Bearer)',
    'auth.scopeSpaceSeparated': 'Scope (space separated)',
    'auth.keyNamePlaceholder': 'Key Name (e.g. X-API-Key)',
    'auth.authorized': 'Authorized',
    'auth.characters': 'chars',
    'auth.refreshTokenAvailable': 'Refresh Token available',
    'auth.refresh': 'Refresh',
    'auth.copy': 'Copy',
    'auth.clear': 'Clear',
    'auth.authorizing': 'Authorizing...',
    'auth.completeAuthInBrowser': 'Please complete authorization in the opened browser window',
    'auth.pasteAuthCode': 'Or paste authorization code',
    'auth.exchangeToken': 'Exchange Token',
    'auth.cancel': 'Cancel',
    'auth.retry': 'Retry',
    'auth.accessTokenManual': 'Access Token (manual input or click to get)',
    'auth.refreshTokenOptional': 'Refresh Token (optional)',
    'auth.getToken': 'Get Token',
    'auth.markAsAuthorized': 'Mark as Authorized',
    'auth.awsSignatureAuth': 'AWS Signature Auth',
    'auth.awsSignatureDescription': 'Use AWS Access Key and Secret Key to sign requests. For AWS services (Lambda, S3, DynamoDB, etc.).',
    'auth.serviceName': 'Service Name (e.g. lambda, s3)',
    'auth.serviceNamePlaceholder': 'Service Name (e.g. lambda, s3)',
    'auth.sessionTokenOptional': 'Session Token (temporary credentials, optional)',
    'auth.sessionTokenPlaceholder': 'Session Token (temporary credentials, optional)',
    'auth.signatureProcess': 'Signature process: Use Secret Key to generate HMAC-SHA256 signature, append to Authorization header',

    // History Panel
    'history.title': 'Request History',
    'history.deleteHistory': 'Delete History',
    'history.deleteSelected': 'Are you sure you want to delete selected',
    'history.clearHistory': 'Clear History',
    'history.confirmClear': 'Are you sure you want to clear all',
    'history.confirmDelete': 'history records?',
    'history.loading': 'Loading...',
    'history.refresh': 'Refresh',
    'history.favoritesOnly': 'Favorites Only',
    'history.showAll': 'Show All',
    'history.delete': 'Delete',
    'history.clear': 'Clear',
    'history.searchPlaceholder': 'Search URL, status...',
    'history.selectAll': 'Select All',
    'history.sort': 'Sort:',
    'history.time': 'Time',
    'history.status': 'Status',
    'history.duration': 'Duration',
    'history.noMatch': 'No matching history found',
    'history.tryOtherKeywords': 'Try other keywords',
    'history.noHistory': 'No request history',
    'history.autoSave': 'History will be saved automatically after sending requests',
    'history.success': 'Success',
    'history.failed': 'Failed',
    'history.open': 'Open',
    'history.copyStatus': 'Copy Status',
    'history.unfavorite': 'Unfavorite',
    'history.favorite': 'Favorite',
    'history.deleteOthers': 'Delete Others',
    'history.confirmDeleteOthers': 'Are you sure you want to delete',

    // Import Config
    'import.noConfig': 'No configuration',
    'import.createConfigToEnable': 'Create a configuration to enable auto-sync',
    'import.everyMinutes': 'Every {count} minutes',
    'import.manualSync': 'Manual sync',
    'import.lastSync': 'Last: {date}',
    'import.syncing': 'Syncing...',
    'import.sync': 'Sync',
    'import.delete': 'Delete',
    'import.title': 'Import',
    'import.apiConfig': 'API Config',
    'import.collectionImport': 'Collection Import/Export',
    'import.savedConfigs': 'Saved Configs',
    'import.newConfig': 'New Config',
    'import.back': '← Back',
    'import.configName': 'Config Name',
    'import.syncInterval': 'Auto-sync Interval',
    'import.cancel': 'Cancel',
    'import.save': 'Save',
    'import.configNameUrlRequired': 'Please enter config name and URL',
    'import.syncedFrom': 'Synced {count} APIs from {name}',
    'import.deleteConfigFailed': 'Failed to delete import config',
    'import.create': '+ New',
    'import.hourly': 'Hourly',
    'import.everyXHours': 'Every {count} hours',
    'import.daily': 'Daily',
    'import.fullBackup': 'Full Backup',

    // Backup
    'backup.exportAll': 'Export All Data',
    'backup.exportDescription': 'Export collections, environments, flows and settings to a single file (auth credentials excluded)',
    'backup.importAll': 'Import All Data',
    'backup.importDescription': 'Restore all data from backup file',
    'backup.replace': 'Replace',
    'backup.merge': 'Merge',
    'backup.exportSuccess': 'Export successful',
    'backup.exportFailed': 'Export failed',
    'backup.importSuccess': 'Import successful',
    'backup.importFailed': 'Import failed',
    'backup.importFromClipboard': 'Import from Clipboard',
    'backup.importFromFile': 'Import from File',
    'backup.exporting': 'Exporting...',
    'backup.fileSizeExceeded': 'File size exceeds 10MB limit',
    'backup.skippedFiles': 'Skipped {count} invalid file(s)',
    'backup.selectFile': 'Select a backup ZIP file to restore your data',
    'backup.fullBackup': 'Full Backup',
    'backup.fullBackupDescription': 'Export or import all app data (collections, environments, flows)',

    // Response Panel
    'response.connect': 'Connect',
    'response.transfer': 'Transfer',
    'response.process': 'Process',
    'response.total': 'Total',
    'response.clickToViewRequest': 'Click to view request details',
    'response.label': 'Response',
    'response.unfavorite': 'Unfavorite',
    'response.favorite': 'Favorite',
    'response.sendRequest': 'Response will be displayed here after sending request',
    'response.ctrlEnter': 'Press Ctrl+Enter to send quickly',
    'response.requestFailed': 'Request Failed',
    'response.timeline': 'Timeline',
    'response.compare': 'Compare',
    'response.preview': 'Preview',
    'response.raw': 'Raw',
    'response.desensitize': 'Desensitize sensitive data',
    'response.desensitizeData': 'Desensitize',
    'response.searchResponse': 'Search response content... (supports regex)',
    'response.copyPath': 'Copy Path',
    'response.copyValue': 'Copy Value',
    'response.copyBody': 'Copy Entire Body',
    'response.copyAsJson': 'Copy as JSON',
    'response.copyAsScriptVar': 'Copy as Script Variable',
    'response.cannotGetValue': 'Cannot get value',
    'response.copyFailed': 'Copy failed',
    'response.selectHistoryResponse': 'Select history response to compare',
    'response.compareResult': 'Compare Result',
    'response.current': 'Current',
    'response.history': 'History',
    'response.diff': 'Diff',
    'response.noHistoryToCompare': 'No history to compare',

    // Navigation
    'nav.apiList': 'API List',
    'nav.flowCanvas': 'Flow Canvas',
    'nav.requestBuilder': 'Request Builder',
    'nav.environment': 'Environment',
    'nav.mockConfig': 'Mock Config',
    'nav.aiChat': 'AI Chat',
    'nav.settings': 'Settings',
    'nav.gitVersion': 'Git Version',

    // AI Chat
    'chat.apiCall': 'API Call',
    'chat.search': 'Search',
    'chat.listApis': 'List APIs',
    'chat.agent': 'Agent',
    'chat.placeholder': 'Ask me anything about your APIs...',
    'chat.send': 'Send',
    'chat.clear': 'Clear',
    'chat.clearConversation': 'Clear conversation',
    'chat.pressEnter': 'Press Enter to send, Shift+Enter for new line',
    'chat.quick': 'Quick',
    'chat.connected': 'Connected',
    'chat.howToUse': 'How to use AI Chat',
    'chat.agentPowered': 'Agent-Powered',
    'chat.quickCommands': 'Quick Commands:',
    'chat.close': 'Close',
    'chat.askMeAnything': 'Ask me anything about your APIs',
    'chat.tryListOrSearch': 'Try: "list all APIs" or "/search user" or just ask naturally!',
    'chat.thinking': 'thinking...',
    'chat.aiChatPoweredByClaude': 'AI Chat is powered by Claude Agent. Just speak naturally and the agent will help you search, analyze, and execute API requests.',
    'chat.cmdSearch': 'Search APIs',
    'chat.cmdList': 'List all APIs',
    'chat.cmdRun': 'Execute API request',
    'chat.cmdHelp': 'Show available commands',

    // Node Types
    'node.apiCall': 'API Call',
    'node.auth': 'Auth',
    'node.condition': 'Condition',
    'node.loop': 'Loop',
    'node.assert': 'Assert',
    'node.transform': 'Transform',
    'node.delay': 'Delay',
    'node.log': 'Log',
    'node.script': 'Script',
    'node.useSimpleMode': 'Use simple mode',
    'node.supportedOperators': 'Supported operators:',
    'node.presetDurations': 'Preset durations:',
    'node.availableApis': 'Available APIs:',
    'node.confirmDelete': 'Confirm delete?',
  },
};

export function t(key: keyof TranslationKey, lang: Language, params?: Record<string, string | number>): string {
  let text = translations[lang][key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return text;
}

export function useTranslation(lang: Language) {
  return (key: keyof TranslationKey, params?: Record<string, string | number>) => t(key, lang, params);
}