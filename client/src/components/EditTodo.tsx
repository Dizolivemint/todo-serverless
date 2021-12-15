import * as React from 'react'
import Auth from '../auth/Auth'
import { getUploadUrl, uploadFile, getTodo, patchTodo } from '../api/todos-api'
import {
  Grid,
  Input,
  Icon,
  Form,
  Button
} from 'semantic-ui-react'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { Todo } from '../types/Todo'
import { calculateDueDate, stringifyDueDate } from '../helpers/DueDate'

enum UploadState {
  NoUpload,
  FetchingPresignedUrl,
  UploadingFile,
}

interface EditTodoProps {
  match: {
    params: {
      todoId: string
    }
  }
  auth: Auth
}

interface EditTodoState {
  todo: Todo
  file: any
  uploadState: UploadState,
  loadingTodo: boolean,
  newTodoName: string,
  dueDate: Date
}

export class EditTodo extends React.PureComponent<
  EditTodoProps,
  EditTodoState
> {
  state: EditTodoState = {
    todo: {
      todoId: '',
      createdAt: '',
      name: '',
      dueDate: stringifyDueDate(calculateDueDate()),
      done: false
    },
    file: undefined,
    uploadState: UploadState.NoUpload,
    loadingTodo: true,
    newTodoName: '',
    dueDate: calculateDueDate()
  }

  async componentDidMount() {
    try {
      const todo = await getTodo(this.props.auth.getIdToken(), this.props.match.params.todoId)
      this.setState({
        todo,
        loadingTodo: false,
        newTodoName: todo.name,
        dueDate: new Date(todo.dueDate)
      })
    } catch (e) {
      let errorMessage = "Failed to fetch task"
      if (e instanceof Error) {
        errorMessage = `${errorMessage}: ${e.message}`
      }
      alert(errorMessage)
    }
  }

  handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    this.setState({
      file: files[0]
    })
  }

  handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault()

    try {
      if (!this.state.file) {
        alert('File should be selected')
        return
      }

      this.setUploadState(UploadState.FetchingPresignedUrl)
      const uploadUrl = await getUploadUrl(this.props.auth.getIdToken(), this.props.match.params.todoId)

      this.setUploadState(UploadState.UploadingFile)
      await uploadFile(uploadUrl, this.state.file)

      alert('File was uploaded!')
    } catch (e) {
      let errorMessage = "Could not upload a file"
      if (e instanceof Error) {
        errorMessage = `${errorMessage}: ${e.message}`
      }
      alert(errorMessage)
    } finally {
      this.setUploadState(UploadState.NoUpload)
    }
  }

  setUploadState(uploadState: UploadState) {
    this.setState({
      uploadState
    })
  }

  onTodoUpdate = async () => {
    this.setState({ loadingTodo: true })
    try {
      const dueDate = stringifyDueDate(this.state.dueDate)
      const newTodo = await patchTodo(this.props.auth.getIdToken(), 
      this.props.match.params.todoId,
      {
        name: this.state.newTodoName,
        dueDate,
        done: this.state.todo.done
      })
      this.setState({
        todo: { 
          todoId: this.state.todo.todoId,
          createdAt: this.state.todo.createdAt,
          name: this.state.newTodoName,
          done: this.state.todo.done,
          dueDate: stringifyDueDate(this.state.dueDate)
        },
        loadingTodo: false
      })
    } catch {
      alert('Todo creation failed')
    }
  }

  handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ newTodoName: event.target.value })
  }

  handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') this.onTodoUpdate()
  }

  render() {
    return (
      <Grid>
        <Grid.Row>
          <h1>Edit task</h1>
          <Grid.Column width={16}>
            <div className="wrapper border-color--grey border-radius--4">
              <Icon 
                name='calendar alternate outline'
                size='big'
              />
              <DatePicker className="datepicker"
                selected={new Date(this.state.todo.dueDate)}
                onChange={(date: Date) => this.setState({ 
                  dueDate: date
                })}
              />
            </div>
          </Grid.Column>
          <Grid.Column width={16}>
            <Input
              icon='pencil'
              iconPosition='left'
              fluid
              placeholder="To change the world..."
              className="mt-1"
              onKeyDown={this.handleKeyDown}
              onChange={this.handleNameChange}
            />
          </Grid.Column>
          <Grid.Column width={16}>
            <Button
              iconn='pencil'
              iconPosition='left'
              color='teal'
              className='mt-1'
              onClick={this.onTodoUpdate}
            >
              Save
            </Button>
          </Grid.Column>
        </Grid.Row>
        <Grid.Row>
          <h1>Upload new image</h1>
          <Grid.Column width={16}>
            <Form onSubmit={this.handleSubmit}>
              <Form.Field>
                <label>File</label>
                <input
                  type="file"
                  accept="image/*"
                  placeholder="Image to upload"
                  onChange={this.handleFileChange}
                />
              </Form.Field>

              {this.renderButton()}
            </Form>
          </Grid.Column>
        </Grid.Row>
      </Grid>
    )
  }

  renderButton() {

    return (
      <div>
        {this.state.uploadState === UploadState.FetchingPresignedUrl && <p>Uploading image metadata</p>}
        {this.state.uploadState === UploadState.UploadingFile && <p>Uploading file</p>}
        <Button
          loading={this.state.uploadState !== UploadState.NoUpload}
          type="submit"
        >
          Upload
        </Button>
      </div>
    )
  }
}
