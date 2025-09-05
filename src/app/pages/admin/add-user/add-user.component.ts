import { Component, OnInit } from '@angular/core';
import { sharedImports } from '../../../shared/shared-imports';
import { UserService } from '../../../services/user.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [
    ...sharedImports,
  ],
  templateUrl: './add-user.component.html',
  styleUrl: './add-user.component.css'
})
export class AddUserComponent implements OnInit {
  constructor(private userService: UserService, private snack: MatSnackBar, private _router: Router) { }

  public user = {
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  }

  ngOnInit(): void { }

  formSubmit() {
    console.log("User data submitted:", this.user);
    if (this.user.username.trim() === '' || this.user.username.trim() === null ||
      this.user.password.trim() === '' || this.user.password.trim() === null ||
      this.user.firstName.trim() === '' || this.user.firstName.trim() === null ||
      this.user.lastName.trim() === '' || this.user.lastName.trim() === null ||
      this.user.email.trim() === '' || this.user.email.trim() === null ||
      this.user.phone.trim() === '' || this.user.phone.trim() === null) {
      this.snack.open("All fields are required", "OK", {
        duration: 3000,
        verticalPosition: 'top',
        horizontalPosition: 'right',

      });
      return;
    }

    //add user: call the user service
    this.userService.addUser(this.user).subscribe({
      next: (data: any) => {
        console.log(data);
        Swal.fire("Success", "Add New User successfully" + "\nYour data is: " + data.id, "success").then(() => {
          // Reset the form after successful registration
          this.user = {
            username: '',
            password: '',
            firstName: '',
            lastName: '',
            email: '',
            phone: ''
          };
          this._router.navigate(['/admin/user-management/']);
        });
      },
      error: (error) => {
        console.log(error);
        this.snack.open("Error in registering user", "OK", {
          duration: 3000,
          verticalPosition: 'top',
          horizontalPosition: 'right',
        });
      },
    });
  }

  clearForm() {
    this.user = {
      username: '',
      password: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    };
  }
}
