function autobind(_: any, _2: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const adjDescriptor: PropertyDescriptor = {
        configurable: true,
        get() {
            const boundFn = originalMethod.bind(this)
            return boundFn
        }
    }
    return adjDescriptor
}

enum ProjectStatus {
    active,
    finished
}


interface Draggable {
    dragStartHanfdler(event: DragEvent): void
    dragEndHanfdler(event: DragEvent): void
}

interface DragTarget {
    dragOverHnadler(event: DragEvent): void
    dropHandler(event: DragEvent): void
    dragLeaveHandler(event: DragEvent): void
}
class Project {
    constructor(public id: string, public title: string, public description: string, public people: number, public status: ProjectStatus) { }
}
type listerner<T> = (items: T[]) => void
class State<T>{
    protected listerners: listerner<T>[] = []

    addListerner(listernerFn: listerner<T>) {
        this.listerners.push(listernerFn)
    }

}
class ProjectState extends State<Project>{
    private projects: Project[] = []
    private static instance: ProjectState

    private constructor() {
        super()
    }

    static getInstance() {
        if (this.instance) {
            return this.instance
        }

        this.instance = new ProjectState()
        return this.instance
    }

    // addListerner(listernerFn: listerner) {
    //     this.listerners.push(listernerFn)
    // }

    addProject(title: string, description: string, numOfPeople: number) {
        const newProject = new Project(Math.random().toString(), title, description, numOfPeople, ProjectStatus.active)
        this.projects.push(newProject)
        this.updateListerner()
    }

    moveProject(projectId: string, newStatus: ProjectStatus) {
        const project = this.projects.find(project => project.id === projectId)
        if (project && project.status !== newStatus) {
            project.status = newStatus
            this.updateListerner()
        }
    }


    private updateListerner() {
        for (const listernerFn of this.listerners) {
            listernerFn(this.projects.slice())
        }
    }
}

const projectState = ProjectState.getInstance()

abstract class Component<T extends HTMLElement, U extends HTMLElement>  {
    templateElement: HTMLTemplateElement
    hostElement: T
    element: U

    constructor(templateId: string, hostElementId: string, newElementId: string, insertAtStart: boolean) {
        this.templateElement = document.getElementById(templateId)! as HTMLTemplateElement
        this.hostElement = document.getElementById(hostElementId)! as T
        const importedNode = document.importNode(this.templateElement.content, true)
        this.element = importedNode.firstElementChild as U
        if (newElementId) {
            this.element.id = newElementId
        }

        this.attach(insertAtStart)
    }

    private attach(insertAtBeginning: boolean) {
        this.hostElement.insertAdjacentElement(insertAtBeginning ? "afterbegin" : "beforeend", this.element)
    }

    abstract configure?(): void
    abstract renderContent(): void
}


class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Draggable {
    private project: Project
    constructor(hostId: string, project: Project) {
        super("single-project", hostId, project.id, false)
        this.project = project
        this.configure()
        this.renderContent()
    }

    renderContent() {
        this.element.querySelector('h2')!.textContent = this.project.title
        this.element.querySelector('h3')!.textContent = this.project.people.toString() + (this.project.people > 1 ? " Persons assigned" : " Person assigned")
        this.element.querySelector('p')!.textContent = this.project.description
    }

    @autobind
    dragStartHanfdler(event: DragEvent): void {
        event.dataTransfer!.setData("text/plain", this.project.id)
        event.dataTransfer!.effectAllowed = 'move'
    }
    dragEndHanfdler(_: DragEvent): void {

    }

    configure() {
        this.element.addEventListener('dragstart', this.dragStartHanfdler)
        this.element.addEventListener('dragend', this.dragEndHanfdler)
    }
}

class ProjectListClass extends Component<HTMLDivElement, HTMLElement> implements DragTarget {
    assignedProjects: Project[]
    // templateElement: HTMLTemplateElement
    // hostElement: HTMLDivElement
    // element: HTMLFormElement
    constructor(private type: "active" | "finished") {
        super('project-list', 'app', `${type}-projects`, false);
        this.assignedProjects = []
        // this.templateElement = document.getElementById('project-list')! as HTMLTemplateElement
        // this.hostElement = document.getElementById('app')! as HTMLDivElement
        // const importedNode = document.importNode(this.templateElement.content, true)
        // this.element = importedNode.firstElementChild as HTMLFormElement
        // this.element.id = `${this.type}-projects`
        // this.assignedProjects = [] 
        // this.attach()
        this.configure()
        this.renderContent()
    }

    configure() {
        this.element.addEventListener("dragover", this.dragOverHnadler)
        this.element.addEventListener("dragleave", this.dragLeaveHandler)
        this.element.addEventListener("drop", this.dropHandler)
        projectState.addListerner((projects: Project[]) => {
            const relevantProject = projects.filter(project => {
                if (this.type === 'active') {
                    return project.status === ProjectStatus.active
                }
                return project.status === ProjectStatus.finished
            })
            this.assignedProjects = relevantProject
            this.renderProjects()
        })
    }

    private renderProjects() {
        const listEl = document.getElementById(`${this.type}-projects-list`)! as HTMLUListElement
        listEl.innerHTML = ""
        for (const projectItem of this.assignedProjects) {
            new ProjectItem(this.element.querySelector('ul')!.id, projectItem)
        }
    }


    @autobind
    dragOverHnadler(event: DragEvent): void {
        if (event.dataTransfer && event.dataTransfer.types[0] === "text/plain") {
            event.preventDefault()
            const listEl = this.element.querySelector('ul')!
            listEl.classList.add('droppable')
        }
    }

    @autobind
    dragLeaveHandler(_: DragEvent): void {
        const listEl = this.element.querySelector('ul')!
        listEl.classList.remove('droppable')
    }

    @autobind
    dropHandler(event: DragEvent): void {
        const projecId = event.dataTransfer!.getData("text/plain")
        projectState.moveProject(projecId, this.type === "active" ? ProjectStatus.active : ProjectStatus.finished)
    }

    renderContent() {
        const listId = `${this.type}-projects-list`
        this.element.querySelector('ul')!.id = listId
        this.element.querySelector('h2')!.textContent = this.type.toUpperCase() + " PROJECTS"
    }

    addProject() { }
}


class ProjectInput extends Component<HTMLDivElement, HTMLFormElement> {
    // templateElement: HTMLTemplateElement
    // hostElement: HTMLDivElement
    // element: HTMLFormElement
    titleInputElement: HTMLInputElement
    descriptionInputElement: HTMLInputElement
    peopleInputElement: HTMLInputElement
    constructor() {
        super("project-input", "app", "user-input", true)
        // this.templateElement = document.getElementById('project-input')! as HTMLTemplateElement
        // this.hostElement = document.getElementById('app')! as HTMLDivElement
        // const importedNode = document.importNode(this.templateElement.content, true)
        // this.element = importedNode.firstElementChild as HTMLFormElement
        // this.element.id = "user-input"
        this.titleInputElement = this.element.querySelector('#title') as HTMLInputElement
        this.descriptionInputElement = this.element.querySelector('#description') as HTMLInputElement
        this.peopleInputElement = this.element.querySelector('#people') as HTMLInputElement
        this.configure()
    }

    renderContent() { }

    private clearInput() {
        this.titleInputElement.value = ""
        this.descriptionInputElement.value = ""
        this.peopleInputElement.value = ""
    }

    private gatherUserInput(): [string, string, number] | void {
        const enteredTitle = this.titleInputElement.value
        const enteredDescription = this.descriptionInputElement.value
        const enteredPeople = this.peopleInputElement.value

        if (enteredTitle.trim().length === 0 || enteredDescription.trim().length === 0 || enteredPeople.trim().length === 0) {
            alert("Invalid Input, please try again")
        } else {
            return [enteredTitle, enteredDescription, parseInt(enteredPeople)]
        }
    }

    @autobind
    private submitHandler(event: Event) {
        event.preventDefault()
        const userInput = this.gatherUserInput()

        if (Array.isArray(userInput)) {
            const [title, desc, people] = userInput
            projectState.addProject(title, desc, people)

            this.clearInput()
        }
    }

    configure() {
        this.element.addEventListener('submit', this.submitHandler.bind(this))
    }
}

const t = new ProjectInput()
const finishedProjectList = new ProjectListClass('finished')
const activeProjectList = new ProjectListClass('active')