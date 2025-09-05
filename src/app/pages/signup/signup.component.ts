import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { sharedImports } from '../../shared/shared-imports';
import { MatSnackBar } from '@angular/material/snack-bar';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    ...sharedImports
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent implements OnInit {
  constructor(private userService:UserService, private snack:MatSnackBar) {}

  public user = {
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  }

  ngOnInit(): void {}

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
      next: (data:any) => {
        console.log(data);
        Swal.fire("Success", "User registered successfully" + "\nYour data is: " + data.id, "success").then(() => {
          // Reset the form after successful registration
          this.user = {
            username: '',
            password: '',
            firstName: '',
            lastName: '',
            email: '',
            phone: ''
          };
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
