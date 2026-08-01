import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/commons/schema/user.schema';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  public async CreateUser(user: User): Promise<User> {
    return await this.userModel.create(user);
  }

  public async GetAllUsers(): Promise<{ users: User[]; count: number }> {
    const users = await this.userModel.find().exec();

    const resurlt = { users: users, count: users.length };
    return resurlt;
  }

  public async GetUserById(id: string): Promise<User> {
    return await this.userModel.findById(id).exec();
  }

  public async UpdateUser(id: string, user: User): Promise<User> {
    return await this.userModel.findByIdAndUpdate(id, user).exec();
  }

  public async DeleteUser(id: string) {
    return await this.userModel.findByIdAndDelete(id).exec();
  }
}
