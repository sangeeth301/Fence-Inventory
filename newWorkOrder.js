import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getProjects from '@salesforce/apex/NewWorkOrder.getProjects';
import { NavigationMixin } from 'lightning/navigation';
import getAccounts from '@salesforce/apex/NewWorkOrder.getAccounts';
import getContacts from '@salesforce/apex/NewWorkOrder.getContacts';
import createProject from '@salesforce/apex/NewWorkOrder.createProject';
import createFenceInventory from '@salesforce/apex/NewWorkOrder.createFenceInventory';
import getPicklistValuesFence from '@salesforce/apex/NewWorkOrder.getPicklistValuesFence';
import getToiletPicklistValues from '@salesforce/apex/NewWorkOrder.getToiletPicklistValues';
import createToiletInventory from '@salesforce/apex/NewWorkOrder.createToiletInventory';
import getWasteDisposalRecordTypes from '@salesforce/apex/NewWorkOrder.getWasteDisposalRecordTypes';
import getPicklistValuesWaste from '@salesforce/apex/NewWorkOrder.getPicklistValues';
import createWasteDisposal from '@salesforce/apex/NewWorkOrder.createWasteDisposal';
import isExternalUser from '@salesforce/apex/NewWorkOrder.isExternalUser';
import getCurrentUser from '@salesforce/apex/NewWorkOrder.getCurrentUser';
import getContactsforWork from '@salesforce/apex/NewWorkOrder.getContactsForProject';
import sendFenceInventoryEmailToCurrentUser from '@salesforce/apex/NewWorkOrderEmailSend.sendFenceInventoryEmailToCurrentUser';
import sendToiletInventoryEmailToCurrentUser from '@salesforce/apex/NewWorkOrderEmailSend.sendToiletInventoryEmailToCurrentUser';
import sendWasteInventoryEmailToCurrentUser from '@salesforce/apex/NewWorkOrderEmailSend.sendWasteInventoryEmailToCurrentUser';
import createContact from '@salesforce/apex/NewWorkOrder.createContact';
import getAllAccounts from '@salesforce/apex/NewWorkOrder.getAllAccounts';
import getProjectsByAccountfront from '@salesforce/apex/NewWorkOrder.getProjectsByAccountfront';



export default class NewWorkOrder extends NavigationMixin(LightningElement) {
    @track project = '';
    @track serviceDate = new Date().toISOString().split('T')[0];
    @track workOrder = '';
    @track showFence = false;
    @track showToilet = false;
    @track showWasteDisposal = false;
    @track projectOptions = [];
    frontPage = false;
    @track createProjectPage = false;
    @track isExternalUser = false;
    @track externalUser = false;
    @track accountName = '';
    @track emailAddress = '';

    @track disableSave = false;

    accountOptionss = [];
    showAccountSelection = false;
    selectedAccountId = '';

    @track filteredProjectOptions = [];
    @track projectSearchTerm = '';
    @track showProjectSuggestions = false;

    @track salesPersonId;
    @track salesPersonName;

    @track contactOptionswork = [];
    

    connectedCallback() {
        this.loadAllAccounts();
        this.isExternalUserTemplate();
        this.loadCurrentUser();
        this.loadAccounts();
        this.loadPicklistValues();
        this.loadPicklistValuesToilet();
        this.loadPicklistOptions();
    }

    loadCurrentUser() {
        getCurrentUser()
            .then(user => {
                this.salesPersonId = user.Id;
                this.salesPersonName = user.Name;
            })
            .catch(error => {
                console.error('Error fetching current user:', error);
            });
    }

    isExternalUserTemplate() {
        isExternalUser()
            .then(result => {
                this.isExternalUser = result;
                if (result === true) {this.externalUser = true;this.frontPage = false; }
                else { this.frontPage = true; console.log('frontpage>>>ex', this.frontPage) }
                console.log("isExternalUser>>", result)
                if (!result) {
                    this.loadProjects();
                }
            })
            .catch(error => {
                console.error('Error checking user type', error);
            });
    }
    handleAccountChangeSearch(event) {
        this.accountName = event.target.value;
    }

    handleEmailChange(event) {
        this.emailAddress = event.target.value;
    }
    submitAccountDetails() {
        if (this.isExternalUser) {
            if (!this.emailAddress) {
                this.showToastSuccess('Please enter your registered Email Address.');
                return;
            }

            if (this.showAccountSelection && !this.selectedAccountId) {
                this.showToastSuccess('Please select an Account.');
                return;
            }

            if (this.showAccountSelection) {
                // Load projects using selected account
                this.loadProjectsForAccount();
            } else {
                // Load using email if no account selection needed
                this.loadProjects();
            }
        }
    }



    loadProjects() {
        if (this.isExternalUser) {
            if (!this.emailAddress) {
                this.showToastSuccess('Please enter your registered Email Address.');
                return;
            }
        }
        const emailToSend = this.isExternalUser ? this.emailAddress : '';

        getProjects({
            email: emailToSend,
            isExternal: this.isExternalUser
        })
        .then(result => {
            // If multiple accounts found
            if (result.accounts && result.accounts.length > 1) {
                this.accountOptionss = result.accounts.map(acc => ({
                    label: acc.Name,
                    value: acc.Id
                }));
                this.showAccountSelection = true;
                return;
            }
            
            // If single account or internal user
            this.projectOptions = [{ label: 'None', value: '' }];
            
            if (result.projects) {
                result.projects.forEach(proj => {
                    this.projectOptions.push({ label: proj.Name, value: proj.Id });
                });
            }

            if (this.projectOptions.length === 1 && this.externalUser) {
                this.showToastSuccess('No matching account or projects found. Please check your details.');
                return;
            }
            this.frontPage = true;
            this.isExternalUser = false;
        })
        .catch(error => {
            console.error('Error loading projects:', error);
        });
    }

// New method to handle account selection
handleAccountSelection(event) {
    this.selectedAccountId = event.detail.value;
}

loadProjectsForAccount() {
    getProjects({
        accountId: this.selectedAccountId,
        isExternal: true
    })
    .then(result => {
        this.projectOptions = [{ label: 'None', value: '' }];
        
        if (result.projects) {
            result.projects.forEach(proj => {
                this.projectOptions.push({ label: proj.Name, value: proj.Id });
            });
        }

        if (this.projectOptions.length === 1) {
            this.showToastSuccess('No projects found for selected account.');
            return;
        }
        
        this.showAccountSelection = false;
        this.isExternalUser = false;
        this.frontPage = true;
    })
    .catch(error => {
        console.error('Error loading projects:', error);
    });
}

    handleProjectSearch(event) {
        this.projectSearchTerm = event.target.value || '';
        console.log('##1', this.projectSearchTerm);
        if (this.projectSearchTerm.length > 0) {
            this.filteredProjectOptions = this.projectOptions.filter(option =>
                option.label.toLowerCase().includes(this.projectSearchTerm.toLowerCase())
            );
            this.showProjectSuggestions = this.filteredProjectOptions.length > 0;
            console.log('##2', this.filteredProjectOptions);
        } else {
            this.filteredProjectOptions = [...this.projectOptions];
            this.showProjectSuggestions = false;
        }
    }

    selectProject(event) {
        
        const selectedValue = event.currentTarget.dataset.value;
        const selectedProject = this.projectOptions.find(option => option.value === selectedValue);
        if (selectedProject) {
             this.project = selectedValue;
            this.projectId = selectedValue;
            this.projectLabel = selectedProject.label;
            this.projectSearchTerm = selectedProject.label;
            this.showProjectSuggestions = false;
            this.fetchContacts();
            const changeEvent = new CustomEvent('change', {
                detail: { value: this.projectId }
            });
            this.dispatchEvent(changeEvent);
        } else {
            console.error('Selected project not found:', selectedValue);
        }
    }
    @track showCreateButton = false;
    @track isModalOpen = false;
    @track newContact = {
        LastName: '',
        Email: '',
        Phone: '',
        HomePhone: '',
        AssistantPhone: ''
    };
    
   fetchContacts() {
        this.contactOptionswork=[];
        getContactsforWork({ projectId: this.project })
          
            .then(result => {
                
                this.contactMap = {}; // <-- map contactId => contact
                this.contactOptionswork.push({ label: 'None', value: 'None' });
                result.forEach(contact => {
                    this.contactOptionswork.push({ label: contact.Name, value: contact.Id });
                    this.contactMap[contact.Id] = contact; // store full contact
                });

                this.showCreateButton = result.length === 0;
            })
            .catch(error => {
                console.error('Error fetching contacts:', error);
            });
    }
     handleInputChange(event) {
        const field = event.target.dataset.field;
        this.newContact[field] = event.target.value;
    }
    saveContact() {
        createContact({ con: this.newContact, projectId: this.project })
            .then(result => {
                this.showToastSuccess('Contact created successfully');
                console.log('saveContact>>', result);

                // Add new contact to contactMap
                this.contactMap[result.Id] = result;

                // Create new dropdown option
                const newOption = {
                    label: result.LastName,
                    value: result.Id
                };

                // Add to options while preserving 'None' at top
                this.contactOptionswork = [
                    { label: 'None', value: 'None' },
                    ...this.contactOptionswork.filter(opt => opt.value), // removes existing 'None'
                    newOption
                ];

                this.closeModal();
                this.showCreateButton = false;
                this.newContact = {
                    LastName: '',
                    Email: '',
                    Phone: '',
                    HomePhone: '',
                    AssistantPhone: ''
                };
            })
            .catch(error => {
                this.showToastSuccess('A contact with these details already exists. Please create a new contact with different information', error);
            });
    }

    openModal() {
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }
    

    workOrderOptions = [
        
        { label: 'Fence', value: 'fence' },
        { label: 'Toilet', value: 'toilet' },
        { label: 'Waste Disposal', value: 'waste_disposal' }
    ];
    

    handleProjectChange(event) {
        this.project = event.detail.value;
        console.log('project>>>>>>>', this.project);
    }

    handleServiceDateChange(event) {
        this.serviceDate = event.detail.value;
    }

    handleWorkOrderChange(event) {
        this.workOrder = event.detail.value;
    }

    handleNewProject() {
        this.frontPage = false;
        this.createProjectPage = true;
    }

    createWorkOrderType() {
        if (this.project == '') {
            this.showToastSuccess('Project selection is required. Please choose a project');
            return;
        }
        if((this.selectedAccountId === null || this.selectedAccountId === '') && !this.externalUser){
            this.showToastSuccess('Account selection is required. Please choose a Account');
            return;
        }
        if (this.workOrder == '' || this.workOrder == 'None') {
            this.showToastSuccess('Work Order selection is required. Please choose a work Order');
            return;
        }

        if (this.workOrder === 'fence') {
            this.frontPage = false;
            this.showFence = true;
        }

        if (this.workOrder === 'toilet') {
            this.showToilet = true;
            this.frontPage = false;
        }

        if (this.workOrder === 'waste_disposal') {
            this.showWasteDisposal = true;
            this.frontPage = false;
        }
    }


    //----------------------------------------search Gen contractor--------------------

    @track generalContractorOptions = [];
    @track filteredGeneralContractorOptions = [];
    @track generalContractorSearchTerm = '';
    @track showGeneralContractorSuggestions = false;

    generalContractorId = '';
    generalContractorName = '';

    handleGeneralContractorSearch(event) {
        this.generalContractorSearchTerm = event.target.value || '';
        if (this.generalContractorSearchTerm.length > 0) {
            this.filteredGeneralContractorOptions = this.generalContractorOptions.filter(option =>
                option.label.toLowerCase().includes(this.generalContractorSearchTerm.toLowerCase())
            );
            this.showGeneralContractorSuggestions = this.filteredGeneralContractorOptions.length > 0;
        } else {
            this.filteredGeneralContractorOptions = [...this.generalContractorOptions];
            this.showGeneralContractorSuggestions = false;
        }
    }

    selectGeneralContractor(event) {
        const selectedValue = event.currentTarget.dataset.value;
        const selectedAccount = this.generalContractorOptions.find(option => option.value === selectedValue);

        if (selectedAccount) {
            this.generalContractorId = selectedAccount.value;
            this.generalContractorName = selectedAccount.label;
            this.generalContractorSearchTerm = selectedAccount.label;
            this.showGeneralContractorSuggestions = false;

            const changeEvent = new CustomEvent('change', {
                detail: { value: this.generalContractorId }
            });
            this.dispatchEvent(changeEvent);
            this.loadContacts(this.generalContractorId);
        } else {
            console.error('Selected general contractor not found:', selectedValue);
        }
    }
    //-------------------------------------------------create project----------------------------

    @track generalContractor = null;
    @track siteSuper = null;
    @track projectName = '';
    @track projectAddress = '';
    @track city = '';
    @track fencePO;
    @track toiletPO;
    @track wastePO;
    @track accountOptions = [];
    @track contactOptions = [];
    @track selectedAccessContct = null;



    async loadAccounts() {
        try {
            const accounts = await getAccounts();
            this.generalContractorOptions = accounts.map(account => ({
                label: account.Name,
                value: account.Id
            }));
            this.filteredGeneralContractorOptions = [...this.generalContractorOptions];
        } catch (error) {
            console.error('Error loading accounts', error);
        }
    }

    async loadContacts(accountId) {
        try {
            const contacts = await getContacts({ accountId });
            this.contactOptions = contacts.map(contact => ({
                label: contact.Name,
                value: contact.Id
            }));
        } catch (error) {
            this.showNotification('Error', 'Failed to load contacts: ' + (error.body?.message || error.message), 'error');
        }
    }

    handleAccountChange(event) {
        this.generalContractor = event.detail.value;
    }
    handleInputChangeAddress(event) {
        this.projectAddress = event.detail.value;
    }
    handleContactChange(event) {
        this.siteSuper = event.detail.value;
    }
    handleAccessContctFence(event) {
        this.selectedAccessContct = event.target.value;
    }
    handleInputChangeCity(event) {
        this.city = event.target.value;
    }
    handleInputChangeFencePO(event) {
        this.fencePO = event.target.value;
    }
    handleInputChangeToiletPO(event) {
        this.toiletPO = event.target.value;
    }
    handleInputChangeWastePO(event) {
        this.wastePO = event.target.value;
    }
    handleInputChangeName(event) {
        this.projectName = event.target.value;
    }

    handleCancel() {
        this.createProjectPage = false;
        this.resetFields();
       
        this.serviceDate = new Date().toISOString().split('T')[0];
        if (this.workOrder === 'fence') {
            this.resetFenceFields();
            this.showFence = false;
        }
        if (this.workOrder === 'waste_disposal') {
            this.resetFieldsWaste();
            this.showWasteDisposal = false;
        }
        if (this.workOrder === 'toilet') {
            this.resetToiletFields();
            this.showToilet = false;
        }
        if(!this.externalUser){
            this.projectOptions=[];
        }
        this.project = '';
        this.projectId = '';
        this.projectLabel = '';
        this.projectSearchTerm = '';
        this.showProjectSuggestions = false;
        this.frontPage = true;
        this.workOrder = 'None';

        this.generalContractorId = '';
        this.generalContractorName = '';
        this.generalContractorSearchTerm = '';

        this.accountSearchTerm = '';
        this.selectedAccountId = null;
        this.selectedAccountLabel = '';

    }
    resetFields() {
        this.generalContractor = null;
        this.siteSuper = null;
        this.projectName = '';
        this.projectAddress = '';
        this.city = '';
        this.fencePO = '';
        this.toiletPO = '';
        this.wastePO = '';
        this.selectedAccessContct = null;
        this.generalContractorId = '';
        this.generalContractorName = '';
        this.generalContractorSearchTerm = '';
    }

    validateRequiredFieldsProject() {
        let isValid = true;

        const fieldsToValidate = [
            this.generalContractorId,
            this.siteSuper,
            this.projectName,
            this.projectAddress,
            this.city
        ];

        fieldsToValidate.forEach(field => {
            if (!field || field.trim() === '') {
                isValid = false;
            }
        });

        return isValid;
    }

    async handleSave() {
        
        this.disableSave = true;
        if (!this.validateRequiredFieldsProject()) {
        this.showToastSuccess('Please fill in all required fields.');
        this.disableSave = false;
        return;
    }

        const fields = {
            General_Contractor__c: this.generalContractorId,
            Site_Super__c: this.siteSuper,
            Name: this.projectName,
            Project_Address__c: this.projectAddress,
            City__c: this.city,
            Fence_PO__c: this.fencePO,
            Toilet_PO__c: this.toiletPO,
            Waste_PO__c: this.wastePO,
            Access_Contact__c: this.selectedAccessContct
        };

        try {
            const recordId = await createProject({ projectData: fields });
            this.showToastSuccess('Project created successfully!');
            this.resetFields();
            setTimeout(() => {
                this.loadProjects();
                this.frontPage = true;
                this.createProjectPage = false;
            }, 2000);
        } catch (error) {
            console.log('Error creating Project:',error);
        }


        this.disableSave = false;
    }

    showNotification(title, message, variant) {
        this.toastMessage = message;
        this.toastType = title;
        this.toastClass = `slds-notify slds-notify_toast slds-theme_${variant}`;
        this.showToast = true;
        setTimeout(() => {
            this.showToast = false;
        }, 3000);
    }
    
    backHome(){
        this.isExternalUser = true;
        this.frontPage = false;
        this.emailAddress ='';
        this.project = '';
        this.projectId = '';
        this.projectLabel = '';
        this.projectSearchTerm = '';
        this.showProjectSuggestions = false;
        this.workOrder = '';
    }

    //=======================================Fence==================================================================

    @track enteredByOptions = [];
    @track jobDescriptionOptions = [];
    @track selectedEnteredBy = '';
    @track selectedJobDescription = '';
    @track appointmentWindowFence = '';
    @track FenceRequirementsFence = '';
    @track orderedByFence = '';
    @track accessContactFence = null;
    @track siteAccessInfoFence = '';
    @track installationInstructionsFence= '';

    accessContactInfo = '';
    orderedByContactInfo = '';
    selectedContactInfo = '';

    loadPicklistValues() {
        getPicklistValuesFence()
            .then(data => {
                this.enteredByOptions = data.Entered_By__c.map(value => ({
                    label: value,
                    value: value
                }));
                this.jobDescriptionOptions = data.Job_Description__c.map(value => ({
                    label: value,
                    value: value
                }));
            })
            .catch(error => {
                console.error('Error loading picklist values:', error);
            });
    }

    handleEnteredByChange(event) {
        this.selectedEnteredBy = event.detail.value;
    }
    handleJobDescriptionChange(event) {
        this.selectedJobDescription = event.detail.value;
    }
    handleAppoinementWindowFence(event) {
        this.appointmentWindowFence = event.detail.value;
    }
    handleFenceRequirements(event) {
        this.FenceRequirementsFence = event.detail.value;
    }
    handleServiceDateChangeFence(event) {
        this.serviceDate = event.detail.value;
    }
    handleorderedByFence(event) {
        this.orderedByFence = event.detail.value;
        this.orderedByContactInfo = this.formatContactInfo(this.orderedByFence);
        this.updateCombinedContactInfo();
    }
    handleAccessContactFence(event) {
        this.accessContactFence = event.detail.value;
        console.log('this.accessContactFence>>',this.accessContactFence);
        this.accessContactInfo = this.formatContactInfo(this.accessContactFence);
        this.updateCombinedContactInfo();
    }
    handleSiteAccessInfoFence(event) {
        this.siteAccessInfoFence = event.detail.value;
    }
    handleInstallationInstructionsFence(event){
        this.installationInstructionsFence = event.detail.value;
    }

    updateCombinedContactInfo() {
    const access = this.accessContactInfo ? `Access Contact: ${this.accessContactInfo}` : '';
    const orderBy = this.orderedByContactInfo ? `Ordered By: ${this.orderedByContactInfo}` : '';
    
    if (!access && !orderBy) {
        this.selectedContactInfo = '⚠️ Warning: Users are not in the system.';
    } else {
        // Remove previous warning if it exists
        this.selectedContactInfo = access && orderBy ? `${access}\n${orderBy}` : access || orderBy;
    }

    console.log('Combined Contact Info:', this.selectedContactInfo);

    const cleanInstructions = (text) => {
        return this.stripContactInfoFromInstructions(text).replace(/^⚠️ Warning:.*(\n)?/, '').trim();
    };

    if (this.workOrder === 'fence') {
        this.installationInstructionsFence = `${this.selectedContactInfo}\n\n${cleanInstructions(this.installationInstructionsFence)}`;
    }
    if (this.workOrder === 'toilet') {
        this.installationInstructionsToilet = `${this.selectedContactInfo}\n\n${cleanInstructions(this.installationInstructionsToilet)}`;
    }
    if (this.workOrder === 'waste_disposal') {
        this.installationInstructionsWaste = `${this.selectedContactInfo}\n\n${cleanInstructions(this.installationInstructionsWaste)}`;
    }
}



    stripContactInfoFromInstructions(text) {
        if (!text) return '';
        return text
            .replace(/Access Contact:.*(\n)?/g, '')
            .replace(/Ordered By:.*(\n)?/g, '')
            .replace(/^⚠️ Warning:.*(\n)?/g, '')
            .trim();
    }




    formatContactInfo(contactId) {
        const contact = this.contactMap[contactId];
        if (contact) {
            const name = contact.Name || '';
            const phone = contact.MobilePhone || '';
            console.log('Mobilephone>>>',phone);
            return `${name} - ${phone}`;
        }
        return '';
    }

    validateRequiredFieldsFence() {
        let isValid = true;

        const fieldsToValidate = [
            this.serviceDate,
            this.appointmentWindowFence,
            this.selectedJobDescription,
            this.FenceRequirementsFence,
            this.orderedByFence,
            this.accessContactFence,
            this.installationInstructionsFence,
            this.siteAccessInfoFence
        ];

        fieldsToValidate.forEach(field => {
            if (!field || field.trim() === '') {
                isValid = false;
            }
        });

        return isValid;
    }


    async handleSaveInventory() {
        this.disableSave = true;

        if (!this.validateRequiredFieldsFence()) {
            this.showToastSuccess('Please fill in all required fields.');
            this.disableSave = false;
            return;
        }
        if(this.accessContactFence === 'None'){
            this.accessContactFence = null;
        }
        if(this.orderedByFence === 'None'){
            this.orderedByFence = null;
        }

        try {
            const result = await createFenceInventory({
                enteredBy: this.selectedEnteredBy,
                jobDescription: this.selectedJobDescription,
                projectId: this.project,
                serviceDate: this.serviceDate,
                appointmentWindow: this.appointmentWindowFence,
                FenceRequirements: this.FenceRequirementsFence,
                orderBy: this.orderedByFence,
                SiteAccessinfo: this.siteAccessInfoFence,
                installationInstructions: this.installationInstructionsFence,
                salesPerson: this.salesPersonId,
                APPOrderstatus:'New',
                Externalemail:this.emailAddress,
                accessContact:this.accessContactFence
                
            });

            const recordUrl = `/lightning/r/Fence_Inventory__c/${result.recordId}/view`;
            const message = `Fence Inventory record created! <a href="${recordUrl}" target="_blank" style="color:white;text-decoration:underline;">${result.workOrderNumber}</a><br/>Order has been entered into the system. Once confirmed, you will receive an email.`;

            this.showToastSuccess(message);
            if(!this.externalUser){
                await sendFenceInventoryEmailToCurrentUser({
                    recordId: result.recordId,
                    emailAddress: this.emailAddress,
                    isExternal: this.externalUser
                });
            }
           

            this.resetFenceFields();
            setTimeout(() => {
                this.frontPage = true;
                this.showFence = false;
            }, 1000);

            this.frontPage = true;
            this.showFence = false;

        } catch (error) {
            this.showToastSuccess('Error creating record: ' + error);
            this.frontPage = true;
            this.showFence = false;
        }

        this.project = '';
        this.projectId = '';
        this.projectLabel = '';
        this.projectSearchTerm = '';
        this.showProjectSuggestions = false;
        this.workOrder = 'None';
        this.disableSave = false;
    }

    showToastSuccess(message) {
        this.toastMessage = message;
        this.toastType = 'Success';
        this.toastIcon = 'utility:success';
        this.toastClass = 'slds-theme_success';
        this.showToast = true;

        // Wait until toast is visible, then inject HTML
        setTimeout(() => {
            if (this.template.querySelector('[ref="toastContent"]')) {
                this.template.querySelector('[ref="toastContent"]').innerHTML = message;
            }
        }, 0);

        setTimeout(() => {
            this.showToast = false;
        }, 3000);
    }



    resetFenceFields() {
        this.selectedEnteredBy = '';
        this.selectedJobDescription = '';
        this.appointmentWindowFence = '';
        this.FenceRequirementsFence = '';
        this.orderedByFence = '';
        this.accessContactFence = '';
        this.siteAccessInfoFence = '';
        this.installationInstructionsFence = '';
        this.accessContactInfo='';
        this.orderedByContactInfo='';
        this.contactOptionswork =[];
        this.serviceDate = new Date().toISOString().split('T')[0];

        this.accountSearchTerm = '';
        this.selectedAccountId = null;
        this.selectedAccountLabel = '';

        this.projectOptions=[];
    }


    //=======================================================Toilet Inventory=========================================//

    @track enteredByOptionsToilet = [];
    @track statusTOptions = [];
    @track selectedEnteredByToilet = '';
    @track selectedStatusT = '';
    @track appointmentWindowToilet = '';
    @track orderByToilet = null;
    @track accessContactToilet = null;
    @track siteAccessWindowToilet = '';
    numOfToilet;
    @track unitTypeToilet = '';
    @track installationInstructionsToilet = '';

    loadPicklistValuesToilet() {
        getToiletPicklistValues()
            .then(data => {
                this.enteredByOptionsToilet = data.Entered_By__c.map(value => ({
                    label: value,
                    value: value
                }));
                this.statusTOptions = data.Status_T__c.map(value => ({
                    label: value,
                    value: value
                }));
            })
            .catch(error => {
                console.log(error);
            });
    }

    handleEnteredByChangeToilet(event) {
        this.selectedEnteredByToilet = event.detail.value;
    }
    handleStatusTChange(event) {
        this.selectedStatusT = event.detail.value;
    }
    handleAppointmentWindowToilet(event) {
        this.appointmentWindowToilet = event.detail.value;
    }
    handleNumOfToilet(event) {
        this.numOfToilet = event.target.value;
    }
    handleServiceDateChangeToilet(event) {
        this.serviceDate = event.target.value;
    }
    handleUnitTypeToilet(event) {
        this.unitTypeToilet = event.target.value;
    }
    handleOrderByToilet(event) {
        this.orderByToilet = event.target.value;
        this.orderedByContactInfo = this.formatContactInfo(this.orderByToilet);
        this.updateCombinedContactInfo();
    }
    handleAccessContactToilet(event) {
        this.accessContactToilet = event.target.value;
        this.accessContactInfo = this.formatContactInfo(this.accessContactToilet);
        this.updateCombinedContactInfo();
    }
    handleSiteAccessWindowToilet(event) {
        this.siteAccessWindowToilet = event.target.value;
    }
    handleInstallationInstructionsToilet(event){
        this.installationInstructionsToilet = event.detail.value;
    }

    validateRequiredFieldsToilet() {
        let isValid = true;

        const fieldsToValidate = [
            this.selectedStatusT,
            this.serviceDate,
            this.numOfToilet,
            this.appointmentWindowToilet,
            this.orderByToilet,
            this.accessContactToilet,
            this.unitTypeToilet,
            this.installationInstructionsToilet,
            this.siteAccessWindowToilet
        ];

        fieldsToValidate.forEach(field => {
            if (!field || field.trim() === '') {
                isValid = false;
            }
        });

        return isValid;
    }


    async handleSaveToilet() {
    this.disableSave = true;

    if (!this.validateRequiredFieldsToilet()) {
        this.showToastSuccess('Please fill in all required fields.');
        this.disableSave = false;
        return;
    }
     if(this.accessContactToilet === 'None'){
        this.accessContactToilet = null;
    }
    if(this.orderByToilet === 'None'){
        this.orderByToilet = null;
    }

    try {
        const result = await createToiletInventory({
            enteredBy: this.selectedEnteredBy,
            statusT: this.selectedStatusT,
            projectId: this.project,
            serviceDate: this.serviceDate,
            noOfToilet: this.numOfToilet,
            appointmentWindow: this.appointmentWindowToilet,
            orderBy: this.orderByToilet,
            accessContact: this.accessContactToilet,
            siteAccessinfo: this.siteAccessWindowToilet,
            unitType: this.unitTypeToilet,
            installationInstructions: this.installationInstructionsToilet,
            APPOrderstatus:'New',
            Externalemail:this.emailAddress
        });

        const recordUrl = `/lightning/r/Toilet_Inventory__c/${result.recordId}/view`;
        const message = `Toilet Inventory record created! <a href="${recordUrl}" target="_blank" style="color:white;text-decoration:underline;">${result.workOrderNumber}</a><br/>Order has been entered into the system. Once confirmed, you will receive an email.`;

        this.showToastSuccess(message);
        if(!this.externalUser){
            await sendToiletInventoryEmailToCurrentUser({
                recordId: result.recordId,
                emailAddress: this.emailAddress,
                isExternal: this.externalUser
            });
        }

        this.resetToiletFields();

    } catch (error) {
        console.error('Error creating record:', error);
        this.showToastSuccess(error);
    }

    this.project = '';
    this.projectId = '';
    this.projectLabel = '';
    this.projectSearchTerm = '';
    this.showProjectSuggestions = false;
    this.workOrder = 'None';
    this.frontPage = true;
    this.showToilet = false;
    this.disableSave = false;
}

    resetToiletFields() {

        this.selectedEnteredByToilet = '';
        this.selectedStatusT = '';
        this.appointmentWindowToilet = '';
        this.orderByToilet = '';
        this.accessContactToilet = '';
        this.siteAccessWindowToilet = '';
        this.numOfToilet = null;
        this.unitTypeToilet = '';
        this.installationInstructionsToilet= '';
        this.accessContactInfo='';
        this.orderedByContactInfo='';
        this.contactOptionswork =[];
        this.serviceDate = new Date().toISOString().split('T')[0];

        this.accountSearchTerm = '';
        this.selectedAccountId = null;
        this.selectedAccountLabel = '';

        this.projectOptions=[];
    }

    //============================== waste disposal ==============================================================

    @track appointmentWindowWaste = '';
    @track jobDescriptionWaste = '';
    @track binSize = '';
    @track commodity = '';
    @track jobDescriptionOptionsWaste = [];
    @track binSizeOptions = [];
    @track commodityOptions = [];
    @track selectedAccessContctWaste = '';
    @track orderedByWaste = '';
    @track siteAccessWaste = '';
    @track installationInstructionsWaste='';


    loadPicklistOptions() {
        getPicklistValuesWaste()
            .then(data => {
                this.jobDescriptionOptionsWaste = data.Job_Description__c.map(v => ({ label: v, value: v }));
                this.binSizeOptions = data.Bin_Size__c.map(v => ({ label: v, value: v }));
                this.commodityOptions = data.Commodity__c.map(v => ({ label: v, value: v }));
            })
            .catch(error => console.error(error));
    }
    handleAppointmentWindowWaste(event) {
        this.appointmentWindowWaste = event.target.value;
    }
    handlejobDescriptionWaste(event) {
        this.jobDescriptionWaste = event.target.value;
    }
    handleselectedAccessContctWaste(event) {
        this.selectedAccessContctWaste = event.target.value;
        this.accessContactInfo = this.formatContactInfo(this.selectedAccessContctWaste);
        this.updateCombinedContactInfo();
    }
    handlebinSize(event) {
        this.binSize = event.target.value;
    }
    handleOrderedByWaste(event) {
        this.orderedByWaste = event.target.value;
        this.orderedByContactInfo = this.formatContactInfo(this.orderedByWaste);
        this.updateCombinedContactInfo();
    }
    handlecommodity(event) {
        this.commodity = event.target.value;
    }
    handleServiceDateChangeWaste(event) {
        this.serviceDate = event.target.value;
    }
    handleSiteAccessWaste(event) {
        this.siteAccessWaste = event.target.value;
    }
    handleInstallationInstructionsWaste(event){
        this.installationInstructionsWaste = event.detail.value;
    }


    validateRequiredFieldsWaste() {
        let isValid = true;

        const fieldsToValidate = [
            this.appointmentWindowWaste,
            this.jobDescriptionWaste,
            this.binSize,
            this.commodity,
            this.serviceDate,
            this.selectedAccessContctWaste,
            this.orderedByWaste,
            this.installationInstructionsWaste,
            this.siteAccessWaste
        ];

        fieldsToValidate.forEach(field => {
            if (!field || field.trim() === '') {
                isValid = false;
            }
        });

        return isValid;
    }

    handleSaveWateDisposal() {
    this.disableSave = true;

    if (!this.validateRequiredFieldsWaste()) {
        this.showToastSuccess('Please fill in all required fields.');
        this.disableSave = false;
        return;
    }
     if(this.selectedAccessContctWaste === 'None'){
        this.selectedAccessContctWaste = null;
    }
    if(this.orderedByWaste === 'None'){
        this.orderedByWaste = null;
    }

    const payload = {
        appointmentWindow: this.appointmentWindowWaste,
        jobDescription: this.jobDescriptionWaste,
        binSize: this.binSize,
        commodity: this.commodity,
        projectWaste: this.project,
        serviceDateWaste: this.serviceDate,
        accessContactWaste: this.selectedAccessContctWaste,
        orderedByWaste: this.orderedByWaste,
        siteAccessInformationWaste: this.siteAccessWaste,
        installationInstructions: this.installationInstructionsWaste,
        APPOrderstatus:'New Order',
        Externalemail:this.emailAddress
    };

    createWasteDisposal({ wasteData: payload })
        .then(result => {
            const recordUrl = `/lightning/r/Waste_Disposal__c/${result.recordId}/view`;
            const message = `Waste Disposal record created! <a href="${recordUrl}" target="_blank" style="color:white;text-decoration:underline;">${result.workOrderNumber}</a><br/>Order has been entered into the system. Once confirmed, you will receive an email.`;

            this.showToastSuccess(message);
            if(!this.externalUser){
                sendWasteInventoryEmailToCurrentUser({
                    recordId: result.recordId,
                    emailAddress: this.emailAddress,
                    isExternal: this.externalUser
                });
            }

            this.resetFieldsWaste();

            setTimeout(() => {
                this.showWasteDisposal = false;
                this.frontPage = true;
            }, 1000);
        })
        .catch(error => {
            console.error('Error creating waste disposal:', error);
            this.disableSave = false;
        });

    this.project = '';
    this.projectId = '';
    this.projectLabel = '';
    this.projectSearchTerm = '';
    this.showProjectSuggestions = false;
    this.workOrder = 'None';
}


    resetFieldsWaste() {
        this.disableSave = false;
        this.selectedRecordTypeId = '';
        this.appointmentWindowWaste = '';
        this.jobDescriptionWaste = '';
        this.binSize = '';
        this.commodity = '';
        this.selectedAccessContctWaste = '';
        this.orderedByWaste = '';
        this.siteAccessWaste = '';
        this.installationInstructionsWaste ='';
        this.accessContactInfo='';
        this.orderedByContactInfo='';
        this.contactOptionswork =[];
        this.serviceDate = new Date().toISOString().split('T')[0];

        this.accountSearchTerm = '';
        this.selectedAccountId = null;
        this.selectedAccountLabel = '';

        this.projectOptions=[];
    }



    //========================================================

    showToast = false;
    toastMessage = '';
    toastType = ''; // 'Success' | 'Error'
    toastClass = ''; // slds-theme_success or slds-theme_error
    toastIcon = '';
    //-----------------------doupdown________

    constructor() {
        super();
        const style = document.createElement('style');
        // below you specify the CSS selector to be changed in the combobox
        style.innerText = `.slds-listbox.slds-listbox_vertical.slds-dropdown.slds-dropdown_fluid.slds-dropdown_left {
            max-height: 100px !important;
        }`;
        document.querySelector('head').appendChild(style);
    }


//==============================================

    @track accountOptionsfront = []; // All accounts fetched from Apex
    @track filteredAccountOptions = [];
    @track showAccountSuggestions = false;
    @track accountSearchTerm = '';
    @track selectedAccountId = null;
    @track selectedAccountLabel = '';

    handleAccountSearch(event) {
        this.accountSearchTerm = event.target.value || '';
        if (this.accountSearchTerm.length > 0) {
            this.filteredAccountOptions = this.accountOptionsfront.filter(option =>
                option.label.toLowerCase().includes(this.accountSearchTerm.toLowerCase())
            );
            this.showAccountSuggestions = this.filteredAccountOptions.length > 0;
        } else {
            this.filteredAccountOptions = [...this.accountOptionsfront];
            this.showAccountSuggestions = false;
        }
    }
    handleAccountBlur() {
        if (this.selectedAccountId && !this.accountSearchTerm) {
            this.accountSearchTerm = this.selectedAccountLabel;
        }
    }


    loadProjectsForInternal() {
        getProjectsByAccountfront({ accountId: this.selectedAccountId })
            .then(projects => {
                this.projectOptions = projects.map(p => ({
                    label: p.Name,
                    value: p.Id
                }));
                this.filteredProjectOptions = [...this.projectOptions];
                this.showProjectSuggestions = false;
                this.projectSearchTerm = '';
            })
            .catch(error => {
                console.error('Error loading projects:', error);
                this.showToastError('Failed to load projects for selected account.');
            });
    }

    loadAllAccounts() {
        getAllAccounts()
            .then(result => {
                console.log('getAllAccounts>>',result);
                this.accountOptionsfront = result.map(acc => ({
                    label: acc.Name,
                    value: acc.Id
                }));
            })
            .catch(error => {
                console.error('Error loading accounts:', error);
            });
    }

    selectAccount(event) {
        const selectedValue = event.currentTarget.dataset.value;
        const selectedAccount = this.accountOptionsfront.find(option => option.value === selectedValue);
        if (selectedAccount) {
            this.selectedAccountId = selectedValue;
            
            this.selectedAccountLabel = selectedAccount.label;
            this.accountSearchTerm = selectedAccount.label;
            this.showAccountSuggestions = false;

            // ✅ Fetch projects related to selected Account
            this.loadProjectsForInternal();

            const changeEvent = new CustomEvent('accountchange', {
                detail: { value: this.selectedAccountId }
            });
            this.dispatchEvent(changeEvent);
        } else {
            console.error('Selected account not found:', selectedValue);
        }
    }

}